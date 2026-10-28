'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const project = path.join(root, '.local-test-projects/Phase3AIntegration');
const evidence = path.join(root, 'docs/maintenance/runs/0003-phase3a-2026-10-27');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ownership = JSON.parse(fs.readFileSync(path.join(project, 'PHASE3A-OWNERSHIP.json'), 'utf8'));
if (ownership.purpose !== 'Phase3AIntegration' || ownership.repository !== root) throw new Error('Wrong fixture identity');
if (!path.resolve(spec.cwd).startsWith(project + path.sep) && path.resolve(spec.cwd) !== project) throw new Error('Wrong cwd');
const allowed = [
  'C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\DotNET\\UnrealBuildTool\\UnrealBuildTool.exe',
  'C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor.exe',
  'C:\\Users\\Owner\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe'
];
if (!allowed.includes(spec.executable) || !/^[a-z0-9-]+$/.test(spec.label)) throw new Error('Unapproved executable/label');
const start = Date.now();
const log = fs.createWriteStream(path.join(evidence, spec.label + '.log'));
const interactive = path.basename(spec.executable).toLowerCase() === 'code.exe';
const child = spawn(spec.executable, spec.args, { cwd: spec.cwd, windowsHide: !interactive, stdio: ['ignore', 'pipe', 'pipe'] });
const entry = { label: spec.label, pid: child.pid, started: new Date(start).toISOString(), ...spec };
const ledger = path.join(evidence, 'owned-processes.jsonl');
fs.appendFileSync(ledger, JSON.stringify(entry) + '\n');
console.log(JSON.stringify(entry));
child.stdout.on('data', data => log.write(data));
child.stderr.on('data', data => log.write(data));
child.on('error', error => { log.write(error.stack); process.exitCode = 1; });
child.on('close', code => {
  const completion = { label: spec.label, pid: child.pid, exitCode: code, elapsedMs: Date.now() - start, finished: new Date().toISOString() };
  fs.appendFileSync(ledger, JSON.stringify(completion) + '\n');
  log.end(); console.log(JSON.stringify(completion)); process.exitCode = code ?? 1;
});
