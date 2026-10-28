'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const project = path.join(root, '.local-test-projects/Phase3AIntegration');
const evidence = path.join(root, 'docs/maintenance/runs/0006-phase3b1b-2026-10-28');
const marker = JSON.parse(fs.readFileSync(path.join(project, 'PHASE3A-OWNERSHIP.json'), 'utf8'));
if (marker.repository !== root || marker.purpose !== 'Phase3AIntegration') throw new Error('Wrong fixture identity');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (path.resolve(spec.cwd) !== project || !/^[a-z0-9-]+$/.test(spec.label)) throw new Error('Wrong execution scope');
const allowed = ['C:\\Users\\Owner\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe', 'C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\DotNET\\UnrealBuildTool\\UnrealBuildTool.exe'];
if (!allowed.includes(spec.executable)) throw new Error('Unapproved executable');
const started = Date.now(), log = fs.createWriteStream(path.join(evidence, spec.label + '.log'));
const child = spawn(spec.executable, spec.args, { cwd: project, windowsHide: !spec.executable.endsWith('Code.exe'), stdio: ['ignore', 'pipe', 'pipe'] });
const ledger = path.join(evidence, 'owned-processes.jsonl');
function record(item) { fs.appendFileSync(ledger, JSON.stringify(item) + '\n'); console.log(JSON.stringify(item)); }
record({ pid: child.pid, started: new Date(started).toISOString(), ...spec });
child.stdout.on('data', value => log.write(value)); child.stderr.on('data', value => log.write(value));
child.on('error', error => { log.write(error.stack); process.exitCode = 1; });
child.on('close', code => { record({ label: spec.label, pid: child.pid, exitCode: code, elapsedMs: Date.now() - started }); log.end(); process.exitCode = code ?? 1; });

