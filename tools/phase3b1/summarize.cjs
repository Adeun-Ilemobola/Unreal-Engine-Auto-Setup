'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const recovery = require('../../unreal-auto-setup/generationRecovery');
const root = path.resolve(__dirname, '../..');
const evidence = path.join(root, 'docs/maintenance/runs/0005-phase3b1-2026-10-27');
async function main() {
  const events = (await fs.readFile(path.join(evidence, 'host-events.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  const requests = new Set(events.filter(item => item.phase === 'start' && ['generate', 'conflict'].includes(item.request.operation)).map(item => item.request.id));
  const generations = events.filter(item => item.phase === 'complete' && requests.has(item.id)).map(item => {
    const result = item.result.generation || item.result;
    const duration = Date.parse(result.execution.completionTime) - Date.parse(result.execution.startTime);
    return { id: item.id, execution: result.execution, preservation: result.preservation.status, commandMs: item.elapsedMs,
      pipelineMs: result.preservation.elapsedMs, managedExecutionMs: duration, observedOutsideManagedExecutionMs: result.preservation.elapsedMs - duration,
      recoveryBytesBeforeFinalManifest: result.preservation.recoveryBytes, conflicts: result.preservation.conflicts.length,
      recoveryLocation: result.preservation.recoveryLocation, savedEditSurvives: item.result.savedEditSurvives, savedTextMatchesDisk: item.result.savedTextMatchesDisk };
  });
  let blobsVerified = 0;
  for (const [index, item] of generations.entries()) {
    const destination = path.join(evidence, 'recovery-metadata', 'transaction-' + index);
    await fs.mkdir(destination, { recursive: true });
    for (const name of await fs.readdir(item.recoveryLocation)) {
      if (!name.endsWith('.json')) continue;
      const content = await fs.readFile(path.join(item.recoveryLocation, name));
      await fs.writeFile(path.join(destination, name), content);
      if (['baseline.json', 'observed.json'].includes(name)) {
        const metadata = JSON.parse(content);
        for (const entry of metadata.entries) if (entry.blob) {
          const bytes = await fs.readFile(path.join(item.recoveryLocation, entry.blob));
          if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error('Recovery blob mismatch: ' + entry.path);
          blobsVerified++;
        }
      }
    }
  }
  const projectRoot = path.join(root, '.local-test-projects/Phase3AIntegration');
  const after = await recovery.capture({ root: projectRoot, filename: path.join(projectRoot, 'Phase3AIntegration.uproject') }, 'C:/Program Files/Epic Games/UE_5.8');
  const before = JSON.parse(await fs.readFile(path.join(evidence, 'protected-before.json'), 'utf8'));
  const final = [...after.values()].map(({ content, ...entry }) => entry);
  await fs.writeFile(path.join(evidence, 'protected-after.json'), JSON.stringify(final, null, 2));
  const current = new Map(final.map(entry => [entry.path.toLowerCase(), entry]));
  const changed = before.entries.filter(entry => entry.kind === 'file' && entry.sha256 !== current.get(entry.path.toLowerCase())?.sha256).map(entry => entry.path);
  const summary = { generations, build: events.find(item => item.id === '3b1-build-after-regeneration' && item.phase === 'complete'),
    recoveryBlobsVerified: blobsVerified, originalProtectedFiles: before.entries.filter(entry => entry.kind === 'file').length,
    originalProtectedFilesWithChangedBytes: changed, currentProtectedFiles: final.filter(entry => entry.kind === 'file').length,
    fixtureRetained: projectRoot, controlledEdit: 'Two saved comment insertions retained in .clang-format; first test comparison corrected for CRLF',
    harnessErrors: events.filter(item => item.phase === 'error') };
  await fs.writeFile(path.join(evidence, 'integration-summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ generations: generations.map(({ recoveryLocation, execution, ...item }) => ({ ...item, execution: execution.status })), build: summary.build.result.status,
    recoveryBlobsVerified: blobsVerified, originalProtectedFiles: summary.originalProtectedFiles, changed: changed.length, currentProtectedFiles: summary.currentProtectedFiles }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
