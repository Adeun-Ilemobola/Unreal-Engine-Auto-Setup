'use strict';
const projects = require('./project'),
  modules = require('./modules'),
  engines = require('./engine');
function interval(value) {
  if (value === 0) return 0;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 10 && value <= 3600) {
    return Math.floor(value);
  }
  return 30;
}
/**
 * Serialize refreshes and coalesce events. collect receives a current-epoch predicate:
 * it must check that predicate before mutating shared state after asynchronous I/O.
 * Discarding a stale publication alone cannot undo earlier collector side effects.
 */
function scheduler({
  collect,
  publish,
  seconds = () => 30,
  setTimer = setInterval,
  clearTimer = clearInterval,
  onError = () => {}
}) {
  let timer,
    period,
    active = false,
    disposed = false,
    flight,
    pending = false,
    epoch = 0;
  function schedule(enabled) {
    const next = enabled ? interval(seconds()) : 0;
    if (period === next) return;
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
    period = next;
    if (next) {
      timer = setTimer(() => {
        if (!flight) void refresh();
      }, next * 1000);
      timer?.unref?.();
    }
  }
  function refresh() {
    if (disposed) return Promise.resolve();
    pending = true;
    if (flight) return flight;
    flight = (async () => {
      while (pending && !disposed) {
        pending = false;
        const start = epoch;
        try {
          const value = await collect(() => !disposed && start === epoch);
          if (disposed || start !== epoch) continue;
          active = !!value?.project;
          schedule(active);
          publish(value);
        } catch (error) {
          if (!disposed && start === epoch) {
            schedule(active);
            onError(error);
          }
        }
      }
    })().finally(() => {
      flight = undefined;
    });
    return flight;
  }
  return {
    refresh,
    reset() {
      epoch++;
      active = false;
      schedule(false);
      return refresh();
    },
    configure() {
      schedule(active);
      return refresh();
    },
    dispose() {
      disposed = true;
      epoch++;
      pending = false;
      schedule(false);
    },
    get busy() {
      return !!flight;
    },
    get enabled() {
      return !!period;
    }
  };
}
/**
 * Context owns timers/listeners/scoped watchers; refreshes do not own a build gate.
 * @param {Object} vscode
 * @param {Object} context
 * @param {import('./contracts').Services} services
 * @param {function(import('./contracts').RuntimeSnapshot):void} publish
 */
function create(vscode, context, services, publish) {
  let snapshot = {},
    scopeWatcher,
    fingerprint = new Map(),
    fingerprintProject,
    sourceFingerprint = new Map(),
    sourceProject,
    previousModules = [];
  const fs = require('node:fs/promises'),
    path = require('node:path');
  const collect = async isCurrent => {
    if (!vscode.workspace.isTrusted || process.platform !== 'win32') {
      services.coordinator?.switchProject(undefined);
      return {};
    }
    const project = await projects.readProject(vscode, { interactive: false });
    if (!project) {
      services.coordinator?.switchProject(undefined);
      return {};
    }
    const [editor, moduleList, plugins, engine] = await Promise.all([
      services.processes.get(project.filename, { fresh: true }),
      modules.discover(project.root),
      modules.plugins(project.root),
      engines.inspect(project.config.get('unrealEngine.enginePath'), project.descriptor.EngineAssociation)
    ]);
    const recovery=await services.ownership?.inspect(project.filename);
    const next = new Map();
    for (const file of [
      project.filename,
      ...project.targets.map(t => path.join(project.root, 'Source', t.file)),
      ...moduleList.map(m => m.buildFile),
      ...plugins.map(p => p.filename)
    ]) {
      try {
        const stat = await fs.stat(file);
        next.set(file, stat.mtimeMs + ':' + stat.size);
      } catch {}
    }
    const coordinator = services.coordinator;
    const nextSources = coordinator ? await require('./dirtyTracker').files(project, moduleList) : undefined;
    const folders = await require('./explorerClass').locations(moduleList, vscode);
    // Stage all asynchronous collection before committing any project/session/coordinator state.
    if (!isCurrent()) return;
    if (fingerprintProject === project.filename) {
      for (const file of new Set([...next.keys(), ...fingerprint.keys()])) {
        if (next.get(file) !== fingerprint.get(file)) services.state.mark(project, file);
      }
    }
    fingerprintProject = project.filename;
    fingerprint = next;
    if (coordinator) {
      coordinator.switchProject(project.filename);
      coordinator.configure({
        mode: project.config.get('unrealSetup.automationMode'),
        delay: project.config.get('unrealSetup.autoBuildDelay')
      });
      if (sourceProject === project.filename) {
        for (const file of new Set([...sourceFingerprint.keys(), ...nextSources.keys()])) {
          if (sourceFingerprint.get(file) !== nextSources.get(file)) {
            coordinator.mark(
              file,
              require('./dirtyTracker').classify(project, [...moduleList, ...previousModules], file)
            );
          }
        }
      }
      sourceFingerprint = nextSources;
      sourceProject = project.filename;
      previousModules = moduleList;
      if (project.config.get('unrealSetup.verboseRuntimeLogging'))
        services.runtimeLog?.(
          '[Runtime] Reconciled ' + nextSources.size + ' local files; ' + coordinator.snapshot().state
        );
      coordinator.reconcile();
    }
    return {
      folders,
      project,
      editor,
      modules: moduleList,
      plugins,
      engine,
      selected: projects.selection(context, project),
      recovery,
      session: services.state.get(project.filename),
      module: modules.recent(context, project, moduleList)
    };
  };
  const controller = scheduler({
    collect,
    seconds: () =>
      services.poll === false
        ? 0
        : vscode.workspace.getConfiguration().get('unrealSetup.runtimeRefreshInterval'),
    publish: value => {
      snapshot = value;
      publish(value);
      void vscode.commands.executeCommand('setContext', 'unrealSetup.projectActive', !!value.project);
      void vscode.commands.executeCommand('setContext', 'unrealSetup.classFolders', value.folders || []);
      void vscode.commands.executeCommand(
        'setContext',
        'unrealSetup.moduleRules',
        (value.modules || []).flatMap(m => [m.buildFile, vscode.Uri.file(m.buildFile).path || m.buildFile])
      );
    },
    onError: error => {
      snapshot = { error: error.message };
      publish(snapshot);
      void vscode.commands.executeCommand('setContext', 'unrealSetup.projectActive', false);
      void vscode.commands.executeCommand('setContext', 'unrealSetup.classFolders', []);
      void vscode.commands.executeCommand('setContext', 'unrealSetup.moduleRules', []);
    }
  });
  function metadata(uri) {
    if (
      uri.fsPath
        .split(/[\\/]/)
        .some(part => ['binaries', 'intermediate', 'saved', 'deriveddatacache'].includes(part.toLowerCase()))
    )
      return;
    if (snapshot.project) services.state.mark(snapshot.project, uri.fsPath);
    void controller.refresh();
  }
  function watch() {
    scopeWatcher?.dispose();
    const root = vscode.workspace.workspaceFolders?.[0];
    if (root) {
      scopeWatcher = vscode.workspace.createFileSystemWatcher(
        vscode.RelativePattern
          ? new vscode.RelativePattern(root, '**/*.{cpp,h,inl,ipp,Build.cs,Target.cs,uproject,uplugin}')
          : '**/*.{cpp,h,inl,ipp,Build.cs,Target.cs,uproject,uplugin}'
      );
      const listeners = [
          scopeWatcher.onDidCreate(metadata),
          scopeWatcher.onDidChange(metadata),
          scopeWatcher.onDidDelete(metadata)
        ],
        watcher = scopeWatcher;
      scopeWatcher = {
        dispose() {
          for (const item of listeners) item.dispose();
          watcher.dispose();
        }
      };
    } else scopeWatcher = undefined;
  }
  if (vscode.workspace.onDidSaveTextDocument)
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(doc => metadata(doc.uri)));
  watch();
  context.subscriptions.push(
    {
      dispose() {
        controller.dispose();
        scopeWatcher?.dispose();
      }
    },
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      snapshot = {};
      services.coordinator?.switchProject(undefined);
      sourceProject = undefined;
      watch();
      void controller.reset();
    }),
    vscode.workspace.onDidChangeConfiguration(() => {
      snapshot = {};
      watch();
      void controller.reset();
    }),
    vscode.workspace.onDidGrantWorkspaceTrust(() => {
      void controller.refresh();
    })
  );
  if (vscode.window.onDidChangeWindowState)
    context.subscriptions.push(
      vscode.window.onDidChangeWindowState(event => {
        if (event.focused) void controller.refresh();
      })
    );
  if (vscode.debug?.onDidStartDebugSession)
    context.subscriptions.push(
      vscode.debug.onDidStartDebugSession(() => controller.refresh()),
      vscode.debug.onDidTerminateDebugSession(() => controller.refresh())
    );
  return { ...controller, refresh: controller.refresh, snapshot: () => snapshot };
}
module.exports = { interval, scheduler, create };
