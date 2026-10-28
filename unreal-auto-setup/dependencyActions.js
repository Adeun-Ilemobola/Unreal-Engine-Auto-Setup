'use strict';
const fs = require('node:fs/promises'),
  path = require('node:path');
const parser = require('./buildCsParser'),
  editor = require('./dependencyEditor'),
  model = require('./dependencyModel'),
  indexApi = require('./dependencyIndex'),
  modules = require('./modules'),
  projects = require('./project'),
  safe = require('./classFiles'),
  diagnostics = require('./dependencyDiagnostics');
/**
 * Own dependency models, index, preview content and UI listeners for one activation.
 * Parsed models can reflect unsaved documents; change() revalidates before WorkspaceEdit.
 * @param {Object} vscode
 * @param {Object} context
 * @param {import('./contracts').Services} services
 */
function create(vscode, context, services) {
  let current = [],
    project,
    signature,
    engineIdentity,
    models = new Map(),
    busy = false,
    disposed = false,
    projectFlight = Promise.resolve();
  const previews = new Map();
  let counter = 0,
    diag;
  const changed = () => {
    if (!disposed) {
      updateIncludeContext();
      diag?.refresh();
      void services.refresh?.();
    }
  };
  const index = indexApi.create({ changed });
  const parsed = async module => {
    const doc = vscode.workspace.textDocuments.find(
      doc => path.resolve(doc.uri.fsPath).toLowerCase() === path.resolve(module.buildFile).toLowerCase()
    );
    const text = doc?.getText ? doc.getText() : await fs.readFile(module.buildFile, 'utf8');
    const cached = models.get(module.buildFile);
    if (cached?.text === text) return cached;
    const value = Object.assign(parser.parse(text, module.name), {
      buildFile: module.buildFile,
      root: module.root,
      origin: module.origin,
      moduleType: module.type
    });
    models.set(module.buildFile, value);
    return value;
  };
  const containing = filename =>
    current.find(m => path.resolve(filename) === path.resolve(m.buildFile) || safe.inside(m.root, filename));
  async function sync(snapshot) {
    if (!snapshot.project) {
      if (project) {
        project = undefined;
        current = [];
        signature = undefined;
        models.clear();
        await index.project([]);
      }
      return;
    }
    project = snapshot.project;
    const identity = JSON.stringify([snapshot.engine?.path, snapshot.engine?.version]);
    if (engineIdentity !== identity) {
      engineIdentity = identity;
      index.invalidateEngine();
    }
    const key = JSON.stringify([
      project.filename,
      snapshot.modules.map(m => [m.buildFile, m.ruleText]),
      project.descriptor.Modules
    ]);
    if (signature === key) return;
    signature = key;
    current = snapshot.modules.map(m => ({
      ...m,
      type: m.type || project.descriptor.Modules?.find(d => d.Name === m.name)?.Type
    }));
    for (const m of current) await parsed(m);
    projectFlight = projectFlight.catch(() => {}).then(() => index.project(current));
    await projectFlight;
    changed();
  }
  let includeCache;
  function updateIncludeContext() {
    const active = vscode.window.activeTextEditor,
      doc = active?.document;
    let resolved = false;
    if (doc && containing(doc.uri.fsPath)) {
      if (!includeCache || includeCache.doc !== doc || includeCache.version !== doc.version)
        includeCache = { doc, version: doc.version, entries: diagnostics.includes(doc.getText()) };
      const entry = includeCache.entries.find(e => e.line === active.selection?.active.line);
      resolved = !!entry && index.resolve(entry.include, doc.uri.fsPath).length === 1;
    }
    void vscode.commands.executeCommand('setContext', 'unrealSetup.includeContext', resolved);
  }
  async function prepare(uri) {
    if (!vscode.workspace.isTrusted) throw new Error('Trust the workspace before dependency operations.');
    const p = await projects.readProject(vscode);
    if (!p) return;
    const list = await modules.discover(p.root);
    project = p;
    current = list.map(m => ({
      ...m,
      type: m.type || p.descriptor.Modules?.find(d => d.Name === m.name)?.Type
    }));
    const filename = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
    if (uri && !containing(uri.fsPath))
      throw new Error('This file is not a recognized project module Build.cs/source.');
    const module = (filename && containing(filename)) || (await modules.choose(vscode, context, p, current));
    if (!module) return;
    await modules.remember(context, p, module);
    await parsed(module);
    changed();
    return { project: p, module };
  }
  async function ensureIndex(force = false) {
    if (!project) {
      project = await projects.readProject(vscode);
      if (!project) return;
      current = await modules.discover(project.root);
    }
    await index.project(current);
    const engine = project.config.get('unrealEngine.enginePath');
    if (engine) await index.engine(engine, { force });
  }
  async function change(source, target, operation, visibility) {
    if (busy) throw new Error('A dependency preview/edit is already active.');
    busy = true;
    let beforeUri, afterUri;
    try {
      const p = await projects.readProject(vscode);
      if (!p) return;
      const list = await modules.discover(p.root);
      const selected = list.find(m => m.buildFile === source.buildFile);
      if (!selected) throw new Error('Source module is no longer discovered.');
      selected.type = selected.type || p.descriptor.Modules?.find(m => m.Name === selected.name)?.Type;
      const matches = new Set(
        [...index.allModules(), ...list]
          .filter(m => m.name.toLowerCase() === target.name.toLowerCase())
          .map(m => m.buildFile)
      );
      if (operation !== 'remove' && matches.size > 1)
        throw new Error('Dependency module name is ambiguous across discovered roots.');
      const relation = model.relationship(selected, target);
      if (operation !== 'remove' && relation.blocked) throw new Error(relation.blocked);
      if (
        operation !== 'remove' &&
        !index.allModules().some(m => m.buildFile === target.buildFile) &&
        !list.some(m => m.buildFile === target.buildFile)
      )
        throw new Error('Target is not a known module. Refresh the dependency index.');
      const original = await fs.readFile(selected.buildFile, 'utf8'),
        proposal = editor.mutate(original, selected.name, { operation, name: target.name, visibility });
      await editor.validate(p, selected, vscode, original);
      let warning = relation.warning || '';
      if (operation === 'remove')
        warning += ' Source code may still use this dependency; no source references will be removed.';
      if (operation === 'move' && visibility === 'Private') {
        warning +=
          ' Downgrading Public to Private can break consumers of public headers. Usage analysis is incomplete.';
        const publicUses = await publicUsage(selected, target.name);
        if (publicUses.length)
          warning += ' Known Public/flat header usage: ' + publicUses.slice(0, 8).join(', ');
      }
      const id = String(++counter);
      beforeUri = vscode.Uri.parse('unreal-dependency-preview:/' + id + '/Current.Build.cs');
      afterUri = vscode.Uri.parse('unreal-dependency-preview:/' + id + '/Proposed.Build.cs');
      previews.set(beforeUri.toString(), original);
      previews.set(afterUri.toString(), proposal.proposed);
      await vscode.commands.executeCommand(
        'vscode.diff',
        beforeUri,
        afterUri,
        'Unreal dependency: ' + selected.name + ' / ' + target.name,
        { preview: true }
      );
      const choice = await vscode.window.showInformationMessage(
        operation + ' ' + target.name + (operation === 'remove' ? '' : ' as ' + visibility) + '?',
        {
          modal: true,
          detail:
            warning +
            '\nReview the Build.cs diff. Apply creates an undoable editor change; save the file when ready.'
        },
        'Apply'
      );
      if (choice !== 'Apply') return;
      const activeProject = await projects.readProject(vscode, { interactive: false });
      if (!activeProject || activeProject.filename !== p.filename)
        throw new Error('Active project changed during preview. Restart the dependency operation.');
      if (operation !== 'remove') {
        const fresh = await modules.discover(activeProject.root),
          sourceNow = fresh.find(m => m.buildFile === selected.buildFile),
          targetNow =
            fresh.find(m => m.buildFile === target.buildFile) ||
            index.allModules().find(m => m.buildFile === target.buildFile);
        if (!sourceNow || !targetNow)
          throw new Error('Module/index context changed during preview. Restart the operation.');
        sourceNow.type =
          sourceNow.type || activeProject.descriptor.Modules?.find(m => m.Name === sourceNow.name)?.Type;
        targetNow.type =
          targetNow.type || activeProject.descriptor.Modules?.find(m => m.Name === targetNow.name)?.Type;
        const check = model.relationship(sourceNow, targetNow);
        if (check.blocked) throw new Error(check.blocked);
      }
      const doc = await editor.apply(vscode, p, selected, proposal);
      models.set(selected.buildFile, parser.parse(doc.getText(), selected.name));
      services.state.mark(p, selected.buildFile);
      await vscode.window.showTextDocument(doc, { preview: false });
      changed();
      vscode.window.showInformationMessage(
        'Dependency edit applied. Save Build.cs when ready; Build saves files first. No build was started.'
      );
      return proposal;
    } finally {
      busy = false; // Keep previews available while their diff editors are open, bounded to recent operations.
      while (previews.size > 20) previews.delete(previews.keys().next().value);
    }
  }
  async function publicUsage(source, target) {
    const files = await indexApi.headers([source]),
      found = [];
    for (const file of files.filter(h => h.visibility !== 'Private')) {
      const text = await fs.readFile(file.filename, 'utf8');
      if (
        diagnostics.includes(text).some(entry => {
          const owners = index.resolve(entry.include, file.filename);
          return owners.length === 1 && owners[0].module.name === target;
        })
      )
        found.push(path.relative(source.root, file.filename));
    }
    return found;
  }
  async function inspect(uri) {
    const selected = await prepare(uri);
    if (!selected) return;
    const value = await parsed(selected.module);
    const lines = parser.categories.map(
      category =>
        category +
        ': ' +
        value.dependencies
          .filter(d => d.category === category)
          .map(d => d.name + ' (line ' + d.line + ')')
          .join(', ')
    );
    await vscode.window.showInformationMessage(
      selected.module.name + ' dependencies',
      {
        modal: true,
        detail: [selected.module.buildFile, 'Edit support: ' + value.status, ...value.reasons, ...lines].join(
          '\n'
        )
      },
      'OK'
    );
  }
  async function editCommand(operation, uri) {
    const selected = await prepare(uri);
    if (!selected) return;
    const value = await parsed(selected.module);
    if (!value.editable) throw new Error(value.status + ': ' + value.reasons.join(' '));
    let target, visibility;
    if (operation === 'add') {
      await index.project(current);
      while (!target) {
        const targets = index.allModules().filter(m => m.name !== selected.module.name);
        const choices = targets.map(m => ({
          label: m.name,
          description: [m.origin, m.plugin ? path.basename(m.plugin) : '', m.type || 'Unknown host']
            .filter(Boolean)
            .join(' / '),
          detail: m.root,
          target: m
        }));
        if (!index.info().status.startsWith('Ready'))
          choices.unshift({
            label: 'Index engine modules...',
            description: index.info().status,
            index: true
          });
        const picked = await vscode.window.showQuickPick(choices, {
          placeHolder: 'Choose a discovered dependency module',
          matchOnDescription: true,
          matchOnDetail: true
        });
        if (!picked) return;
        if (picked.index) {
          await ensureIndex();
          if (!project.config.get('unrealEngine.enginePath'))
            throw new Error('Configure the active engine path to index engine modules.');
        } else target = picked.target;
      }
      const rec = model.recommendation(selected.module, vscode.window.activeTextEditor?.document.uri.fsPath);
      visibility = await vscode.window.showQuickPick(
        [rec.visibility, rec.visibility === 'Public' ? 'Private' : 'Public'],
        { placeHolder: 'Recommended ' + rec.visibility + ': ' + rec.reason }
      );
      if (!visibility) return;
      const existing = model.dependencies(value).find(d => d.name === target.name);
      if (existing?.visibility === 'Private' && visibility === 'Public') {
        if (
          (await vscode.window.showInformationMessage(
            'Dependency already exists as Private. Promote Private -> Public?',
            { modal: true },
            'Promote'
          )) !== 'Promote'
        )
          return;
        operation = 'move';
      }
    } else {
      const dep = (
        await vscode.window.showQuickPick(
          model
            .dependencies(value)
            .map(d => ({ label: d.name, description: d.visibility + ' / line ' + d.line, dep: d })),
          { placeHolder: 'Choose an unambiguous dependency' }
        )
      )?.dep;
      if (!dep) return;
      target = index.allModules().find(m => m.name === dep.name) ||
        current.find(m => m.name === dep.name) || { name: dep.name };
      visibility =
        operation === 'move' ? (dep.visibility === 'Public' ? 'Private' : 'Public') : dep.visibility;
      if (operation === 'move' && !target.buildFile) {
        await ensureIndex();
        target = index.allModules().find(m => m.name === dep.name);
        if (!target) throw new Error('Dependency module is unresolved. Refresh the index first.');
      }
    }
    await change(selected.module, target, operation, visibility);
  }
  async function findInclude() {
    const doc = vscode.window.activeTextEditor?.document,
      position = vscode.window.activeTextEditor?.selection.active;
    if (!doc || !position) throw new Error('Place the cursor on a C++ include.');
    const entry = diagnostics.includes(doc.getText()).find(e => e.line === position.line);
    if (!entry) throw new Error('Place the cursor on a #include directive.');
    const selected = await prepare(doc.uri);
    if (!selected) return;
    await ensureIndex();
    const found = index.resolve(entry.include, doc.uri.fsPath);
    if (found.length !== 1) {
      vscode.window.showInformationMessage(
        found.length
          ? 'Include ownership is ambiguous: ' + found.map(h => h.module.name + ' / ' + h.filename).join(', ')
          : 'No module found for this exact include path.'
      );
      return;
    }
    const target = found[0].module,
      value = await parsed(selected.module),
      existing = model.dependencies(value).filter(d => d.name === target.name);
    const rec = model.recommendation(selected.module, doc.uri.fsPath);
    const status =
      target.name === selected.module.name
        ? 'Own module'
        : existing.length
          ? existing.map(d => d.visibility).join(', ')
          : value.editable
            ? 'Missing'
            : 'Unknown (complex rules)';
    const allowed =
      status === 'Missing' &&
      found[0].visibility !== 'Private' &&
      !model.relationship(selected.module, target).blocked;
    const promote =
      status === 'Private' &&
      rec.visibility === 'Public' &&
      value.editable &&
      !model.relationship(selected.module, target).blocked;
    const actions = promote
      ? ['Promote Private -> Public']
      : allowed
        ? [
            'Add ' + rec.visibility + ' Dependency',
            'Add ' + (rec.visibility === 'Public' ? 'Private' : 'Public') + ' Dependency'
          ]
        : [];
    const choice = await vscode.window.showInformationMessage(
      entry.include + ' -> ' + target.name + ' | ' + selected.module.name + ': ' + status,
      { detail: rec.reason },
      ...actions
    );
    if (choice)
      await change(
        selected.module,
        target,
        promote ? 'move' : 'add',
        choice.includes('Public') ? 'Public' : 'Private'
      );
  }
  const service = {
    index,
    parsed,
    containing,
    sync,
    change,
    ensureIndex,
    info: () => index.info(),
    snapshot: module => {
      const m = module || current[0],
        value = m && models.get(m.buildFile);
      const graph = model.graph(current, models, index.allModules().length ? index.allModules() : current);
      return {
        module: m?.name,
        buildFile: m?.buildFile,
        parsed: value,
        index: index.info(),
        warnings: graph.warnings
      };
    },
    dispose() {
      disposed = true;
      index.dispose();
      previews.clear();
    }
  };
  if (vscode.workspace.registerTextDocumentContentProvider)
    context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider('unreal-dependency-preview', {
        provideTextDocumentContent: uri => previews.get(uri.toString()) || 'Preview expired.'
      })
    );
  const commands = {
    inspectDependencies: inspect,
    addDependency: uri => editCommand('add', uri),
    removeDependency: uri => editCommand('remove', uri),
    changeDependencyVisibility: uri => editCommand('move', uri),
    findModuleForInclude: findInclude,
    refreshDependencyIndex: async () => {
      await ensureIndex(true);
      changed();
    },
    manageDependencies: async uri => {
      const selected = await prepare(uri);
      if (!selected) return;
      const command = await vscode.window.showQuickPick(['Inspect', 'Add', 'Remove', 'Change Visibility'], {
        placeHolder: selected.module.name + ' dependencies'
      });
      if (command === 'Inspect') await inspect(vscode.Uri.file(selected.module.buildFile));
      else if (command)
        await editCommand(
          command === 'Add' ? 'add' : command === 'Remove' ? 'remove' : 'move',
          vscode.Uri.file(selected.module.buildFile)
        );
    },
    applyDependency: async args => {
      await prepare(vscode.Uri.file(args.source));
      const source = current.find(m => m.buildFile === args.source),
        target = index.allModules().find(m => m.buildFile === args.target);
      if (!source || !target) throw new Error('Dependency context expired. Refresh the index.');
      await change(source, target, 'add', args.visibility);
    }
  };
  for (const [id, fn] of Object.entries(commands))
    context.subscriptions.push(
      vscode.commands.registerCommand('unrealSetup.' + id, async (...args) => {
        try {
          return await fn(...args);
        } catch (error) {
          vscode.window.showErrorMessage('Unreal dependencies: ' + error.message);
        }
      })
    );
  for (const event of ['onDidChangeTextEditorSelection', 'onDidChangeActiveTextEditor'])
    if (vscode.window[event]) context.subscriptions.push(vscode.window[event](updateIncludeContext));
  diag = diagnostics.register(vscode, context, service);
  if (vscode.workspace.onDidChangeTextDocument)
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        includeCache = undefined;
        updateIncludeContext();
        const m = containing(event.document.uri.fsPath);
        if (m && event.document.uri.fsPath === m.buildFile) {
          void parsed(m)
            .then(changed)
            .catch(error => {
              if (!disposed) vscode.window.showWarningMessage('Unreal dependency parsing: ' + error.message);
            });
        }
      })
    );
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{h,hpp,inl,Build.cs,uplugin}');
  let timer;
  const invalidate = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!disposed) {
        signature = undefined;
        void index
          .project(current)
          .then(changed)
          .catch(error => {
            vscode.window.showWarningMessage('Dependency project index: ' + error.message);
          });
      }
    }, 500);
    timer.unref?.();
  };
  context.subscriptions.push(
    watcher,
    watcher.onDidCreate(invalidate),
    watcher.onDidChange(invalidate),
    watcher.onDidDelete(invalidate),
    {
      dispose() {
        clearTimeout(timer);
      }
    },
    service
  );
  return service;
}
module.exports = { create };
