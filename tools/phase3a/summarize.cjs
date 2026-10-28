'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const project = path.join(root, '.local-test-projects/Phase3AIntegration');
const evidence = path.join(root, 'docs/maintenance/runs/0003-phase3a-2026-10-27');
function curate(key, item) {
  if (key === 'config') return '[VS Code configuration omitted]';
  if (key === 'parsed' && item) return { status: item.status, editable: item.editable, dependencies: item.dependencies };
  return item;
}
async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(filename));
    else if (entry.isFile()) files.push(filename);
  }
  return files;
}
async function main() {
  // Run only after host stop: omit broad VS Code configuration and parser internals,
  // retaining observed results, errors, project identities, timing and index counts.
  const eventFile = path.join(evidence, 'host-events.jsonl');
  const entries = (await fs.readFile(eventFile, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  await fs.writeFile(eventFile, entries.map(entry => JSON.stringify(entry, curate)).join('\n') + '\n');
  for (const name of ['editor-running-snapshot.json', 'final-host-snapshot.json']) {
    const entry = JSON.parse(await fs.readFile(path.join(evidence, name), 'utf8'));
    await fs.writeFile(path.join(evidence, name), JSON.stringify(entry, curate, 2));
  }
  const measured = entries.filter(entry => entry.phase === 'activation-complete' || entry.result?.[0]?.label || entry.id === 'engine-index-once');
  await fs.writeFile(path.join(evidence, 'timings.json'), JSON.stringify(measured.map(({ snapshot, ...entry }) => entry), null, 2));
  const checks = [];
  for (const [filename, name, base] of [['ProbeObject','UProbeObject','UObject'],['ProbeActor','AProbeActor','AActor'],['ProbeComponent','UProbeComponent','UActorComponent'],['ProbeSubsystem','UProbeSubsystem','UGameInstanceSubsystem']]) {
    const header = await fs.readFile(path.join(project, 'Source/Phase3AIntegration', filename + '.h'), 'utf8');
    const valid = header.includes('UCLASS(') && header.includes('GENERATED_BODY()') && header.includes(filename + '.generated.h') && header.includes('PHASE3AINTEGRATION_API ' + name + ' : public ' + base);
    if (!valid) throw new Error('Unexpected generated class: ' + filename);
    checks.push({ filename, name, base, valid });
  }
  const manifest = [];
  for (const directory of ['Source', 'Config', 'Plugins']) {
    for (const filename of await walk(path.join(project, directory))) {
      if (filename.split(path.sep).some(part => ['Binaries', 'Intermediate', 'Saved'].includes(part))) continue;
      const content = await fs.readFile(filename);
      manifest.push({ file: path.relative(project, filename), bytes: content.length, sha256: crypto.createHash('sha256').update(content).digest('hex') });
    }
  }
  await fs.writeFile(path.join(evidence, 'generated-source-checks.json'), JSON.stringify({ checks, manifest }, null, 2));
  const outputs = (await walk(path.join(project, 'host-data/logs'))).filter(file => /\d+-Unreal (Build History|Engine Auto Setup)\.log$/.test(file));
  for (const label of ['Build History', 'Engine Auto Setup']) {
    const parts = [];
    for (const filename of outputs.filter(file => file.endsWith('Unreal ' + label + '.log'))) parts.push('--- ' + path.relative(project, filename) + ' ---\n' + await fs.readFile(filename, 'utf8'));
    await fs.writeFile(path.join(evidence, label === 'Build History' ? 'managed-build-output.log' : 'extension-and-doctor-output.log'), parts.join('\n'));
  }
  console.log(JSON.stringify({ classChecks: checks.length, generatedSourceFiles: manifest.length, hostEvents: entries.length, copiedOutputLogs: outputs.length }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
