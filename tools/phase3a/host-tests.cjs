'use strict';
// Loaded by VS Code's real --extensionTestsPath runner, not by the Node unit mocks.
const fs = require('node:fs/promises');
const path = require('node:path');
const repository = path.resolve(__dirname, '../..');
const project = path.join(repository, '.local-test-projects/Phase3AIntegration');
const evidence = path.join(repository, 'docs/maintenance/runs/0003-phase3a-2026-10-27');
const control = path.join(project, 'control');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function record(file, value) { await fs.writeFile(path.join(evidence, file), JSON.stringify(value, null, 2)); }
async function event(value) {
  const seen = new WeakSet();
  const json = JSON.stringify({ time: new Date().toISOString(), ...value }, (key, item) => {
    if (key === 'config') return '[VS Code configuration omitted]';
    if (key === 'parsed' && item) return { editable: item.editable, status: item.status, dependencies: item.dependencies };
    if (item && typeof item === 'object') { if (seen.has(item)) return '[Circular/reference]'; seen.add(item); }
    return item;
  });
  await fs.appendFile(path.join(evidence, 'host-events.jsonl'), json + '\n');
}

exports.run = async (vscode = require('vscode')) => {
  if (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath.toLowerCase() !== project.toLowerCase()) throw new Error('Wrong test workspace');
  await fs.mkdir(control, { recursive: true });
  const extension = vscode.extensions.getExtension('local-tools.unreal-project-tools');
  await record('host-environment.json', {
    vscode: vscode.version, node: process.version, pid: process.pid, trusted: vscode.workspace.isTrusted,
    workspace: project, extensions: ['local-tools.unreal-project-tools', 'ms-vscode.cpptools', 'skyboxlabs.unrealengine-tools'].map(id => {
      const found = vscode.extensions.getExtension(id);
      return { id, path: found?.extensionPath, version: found?.packageJSON.version, active: found?.isActive };
    })
  });
  if (!extension) throw new Error('Extension unavailable');
  if (!vscode.workspace.isTrusted) {
    await event({ phase: 'waiting-for-user-workspace-trust' });
    await new Promise(resolve => { const subscription = vscode.workspace.onDidGrantWorkspaceTrust(() => { subscription.dispose(); resolve(); }); });
    await event({ phase: 'workspace-trust-granted' });
  }
  await event({ phase: 'activation-start' });
  const alreadyActive = extension.isActive;
  const start = performance.now();
  const api = await extension.activate();
  await event({ phase: 'activation-complete', alreadyActive, activationWaitMs: performance.now() - start, snapshot: api.snapshot() });
  let last;
  const deadline = Date.now() + 90 * 60 * 1000;
  while (Date.now() < deadline) {
    let request;
    try { request = JSON.parse(await fs.readFile(path.join(control, 'request.json'), 'utf8')); } catch { await pause(200); continue; }
    if (request.id === last) { await pause(200); continue; }
    last = request.id;
    await event({ phase: 'request-start', request });
    const started = performance.now();
    try {
      let result;
      if (request.operation === 'stop') { await event({ phase: 'host-stop' }); if (request.closeWindow) await vscode.commands.executeCommand('workbench.action.closeWindow'); return; }
      if (request.operation === 'command') {
        if (!request.command.startsWith('unrealSetup.')) throw new Error('Only Unreal test commands allowed');
        const args = request.args?.map(arg => arg?.relativeUri ? vscode.Uri.file(path.join(project, arg.relativeUri)) : arg) || [];
        result = await vscode.commands.executeCommand(request.command, ...args);
      } else if (request.operation === 'snapshot') { await api.refresh(); result = api.snapshot(); }
      else if (request.operation === 'document') {
        const filename = path.resolve(project, request.file);
        if (!filename.startsWith(project + path.sep)) throw new Error('Outside fixture');
        const doc = await vscode.workspace.openTextDocument(filename);
        await vscode.window.showTextDocument(doc);
        if (request.action === 'undo') await vscode.commands.executeCommand('undo');
        if (request.action === 'redo') await vscode.commands.executeCommand('redo');
        if (request.action === 'save') await doc.save();
        result = { dirty: doc.isDirty, text: doc.getText() };
      } else if (request.operation === 'saveAll') { result = await vscode.workspace.saveAll(false); }
      else if (request.operation === 'diagnostics') {
        result = vscode.languages.getDiagnostics().filter(([uri]) => uri.fsPath.toLowerCase().startsWith(project.toLowerCase())).map(([uri, items]) => ({ file: uri.fsPath, items: items.map(d => ({ message: d.message, line: d.range.start.line + 1, source: d.source, severity: d.severity })) }));
      } else if (request.operation === 'debugState') result = { name: vscode.debug.activeDebugSession?.name, type: vscode.debug.activeDebugSession?.type };
      else if (request.operation === 'stopDebug') { await vscode.debug.stopDebugging(); result = true; }
      else if (request.operation === 'measure') {
        const projectApi = require('../../unreal-auto-setup/project');
        const modules = require('../../unreal-auto-setup/modules');
        const tracker = require('../../unreal-auto-setup/dirtyTracker');
        const samples = [];
        let context, list;
        async function sample(label, work) { const t = performance.now(); const value = await work(); samples.push({ label, elapsedMs: performance.now() - t, count: Array.isArray(value) ? value.length : value instanceof Map ? value.size : undefined }); return value; }
        context = await sample('projectDiscovery', () => projectApi.readProject(vscode, { interactive: false }));
        list = await sample('moduleDiscovery', () => modules.discover(project));
        await sample('pluginDiscovery', () => modules.plugins(project));
        await sample('savedFileReconciliation', () => tracker.files(context, list));
        await sample('runtimeRefresh', () => api.refresh());
        result = samples;
      } else throw new Error('Unknown request');
      await event({ phase: 'request-complete', id: last, elapsedMs: performance.now() - started, result });
    } catch (error) { await event({ phase: 'request-error', id: last, error: error.stack }); }
  }
  throw new Error('Host test deadline reached');
};
