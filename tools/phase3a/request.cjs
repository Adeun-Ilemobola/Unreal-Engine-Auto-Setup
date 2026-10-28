'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const project = path.join(root, '.local-test-projects/Phase3AIntegration');
const events = path.join(root, 'docs/maintenance/runs/0003-phase3a-2026-10-27/host-events.jsonl');
async function main() {
  const [id, operation, parameter, action] = process.argv.slice(2);
  if (!id || !operation) throw new Error('id and operation required');
  const request = { id, operation };
  if (operation === 'command') request.command = parameter;
  if (operation === 'document') { request.file = parameter; request.action = action; }
  if (operation === 'stop') request.closeWindow = parameter === 'close';
  await fs.writeFile(path.join(project, 'control/request.json'), JSON.stringify(request));
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    const entries = (await fs.readFile(events, 'utf8')).trim().split('\n');
    for (const line of entries.slice(-8)) {
      let entry; try { entry = JSON.parse(line); } catch { continue; }
      if (entry.id === id && ['request-complete', 'request-error'].includes(entry.phase)) {
        console.log(JSON.stringify(entry)); if (entry.phase === 'request-error') process.exitCode = 1; return;
      }
      if (operation === 'stop' && entry.phase === 'host-stop') { console.log(line); return; }
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Host request deadline exceeded: ' + id);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
