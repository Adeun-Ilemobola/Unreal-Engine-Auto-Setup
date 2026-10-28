'use strict';
// Real interactive Development Host driver. No internal-helper substitute for commands.
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const root = path.resolve(__dirname, '../..');
const project = path.join(root, '.local-test-projects/Phase3AIntegration');
const evidence = path.join(root, 'docs/maintenance/runs/0006-phase3b1b-2026-10-28');
const control = path.join(project, 'phase3b1b-control');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function event(value) { await fs.appendFile(path.join(evidence, 'host-events.jsonl'), JSON.stringify({ time: new Date().toISOString(), ...value }) + '\n'); }
exports.run = async (vscode,context) => {
  if (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath.toLowerCase() !== project.toLowerCase()) throw new Error('Wrong fixture');
  const marker = JSON.parse(await fs.readFile(path.join(project, 'PHASE3A-OWNERSHIP.json'), 'utf8'));
  if (marker.repository !== root || marker.purpose !== 'Phase3AIntegration') throw new Error('Wrong ownership');
  await fs.mkdir(control, { recursive: true });
  await event({ phase: 'environment', vscode: vscode.version, node: process.version, pid: process.pid, trusted: vscode.workspace.isTrusted,
    extensions: ['local-tools.unreal-project-tools', 'ms-vscode.cpptools', 'skyboxlabs.unrealengine-tools'].map(id => { const ext = vscode.extensions.getExtension(id); return { id, version: ext?.packageJSON.version, path: ext?.extensionPath }; }) });
  if (!vscode.workspace.isTrusted) { await event({phase:'waiting-for-trust'}); await new Promise(resolve=>{const sub=vscode.workspace.onDidGrantWorkspaceTrust(()=>{sub.dispose();resolve();});}); }
  const api = await vscode.extensions.getExtension('local-tools.unreal-project-tools').activate();
  await event({ phase: 'ready' });
  let previous;
  const deadline = Date.now() + 45 * 60 * 1000;
  while (Date.now() < deadline) {
    let request;
    try { request = JSON.parse(await fs.readFile(path.join(control, 'request.json'), 'utf8')); } catch { await pause(200); continue; }
    if (request.id === previous) { await pause(200); continue; }
    previous = request.id;
    const started = performance.now();
    await event({ phase: 'start', request });
    try {
      let result;
      if (request.operation === 'close') { await event({ phase: 'closing' }); await vscode.commands.executeCommand('workbench.action.closeWindow'); return; }
      if (request.operation === 'snapshot') { await api.refresh(); const snap = api.snapshot(); result = { project: snap.project?.filename, selected: snap.selected, editor: snap.editor, generation: snap.session?.lastGeneration, automation: snap.automation }; }
      else if (request.operation === 'generate' || request.operation === 'conflict') {
        if (request.operation === 'generate') result = await vscode.commands.executeCommand('unrealSetup.regenerate');
        else {
          // Edit only this task's disposable .clang-format after observing real UBT.
          const filename = path.join(project, '.clang-format');
          const before = await fs.readFile(filename, 'utf8');
          const running = vscode.commands.executeCommand('unrealSetup.regenerate');
          let finished = false; running.finally(() => { finished = true; });
          let owned;
          const until = Date.now() + 30000;
          while (!finished && Date.now() < until) {
            const query = await promisify(execFile)('powershell.exe', ['-NoLogo', '-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"Name='UnrealBuildTool.exe'\" | Select-Object ProcessId,CreationDate,CommandLine | ConvertTo-Json -Compress"], { windowsHide: true, timeout: 5000 });
            const parsed = query.stdout.trim() ? JSON.parse(query.stdout) : [];
            owned = (Array.isArray(parsed) ? parsed : [parsed]).find(item => item.CommandLine?.toLowerCase().includes(project.toLowerCase()) && item.CommandLine?.toLowerCase().includes('-projectfiles'));
            if (owned) break;
            await pause(100);
          }
          if (!owned || finished) { result = { integrationBlocked: 'No active project-associated UBT observed before completion', generation: await running }; }
          else {
            await event({ phase: 'owned-ubt-observed', process: owned });
            const doc = await vscode.workspace.openTextDocument(filename);
            await vscode.window.showTextDocument(doc);
            const edit = new vscode.WorkspaceEdit(); edit.insert(doc.uri, doc.positionAt(doc.getText().length), '\n# Phase3B1b controlled saved edit\n');
            if (!await vscode.workspace.applyEdit(edit) || !await doc.save()) throw new Error('Controlled edit/save failed');
            const savedBytes = await fs.readFile(filename);
            await event({ phase: 'controlled-save-complete', file: filename, version: doc.version, dirty: doc.isDirty, savedText: doc.getText() });
            const generation = await running;
            result = { generation, savedEditSurvives: (await fs.readFile(filename)).equals(savedBytes), savedTextMatchesDisk: savedBytes.toString('utf8') === doc.getText(), process: owned };
            // Retain saved edit as evidence; do not restore it automatically.
          }
        }
      } else if (request.operation === 'seedProvider') { const filename=path.join(project,'.vscode/c_cpp_properties.json'); const before=await fs.readFile(filename); await fs.writeFile(path.join(evidence,'provider-before-seed.json'),before,{flag:'wx'}); const doc=await vscode.workspace.openTextDocument(filename); if(doc.isDirty) throw new Error('Provider document dirty'); const edit=new vscode.WorkspaceEdit(); edit.replace(doc.uri,new vscode.Range(doc.positionAt(0),doc.positionAt(doc.getText().length)),JSON.stringify({configurations:[{name:'Phase3B1b',configurationProvider:'skyboxlabs.unrealengine-tools'}],version:4},null,2)+'\n'); if(!await vscode.workspace.applyEdit(edit)||!await doc.save()) throw new Error('Provider seed failed'); result={seeded:true,text:doc.getText()}; } else if (request.operation === 'build') result = await vscode.commands.executeCommand('unrealSetup.build');
      else if (request.operation === 'doctor') result = await vscode.commands.executeCommand('unrealSetup.diagnose');
      else throw new Error('Unsupported bounded operation');
      await event({ phase: 'complete', id: request.id, elapsedMs: performance.now() - started, result });
    } catch (error) { await event({ phase: 'error', id: request.id, error: error.stack }); }
  }
};

