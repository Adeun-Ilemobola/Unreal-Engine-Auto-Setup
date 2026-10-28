'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const evidence = path.join(root, 'docs/maintenance/runs/0005-phase3b1-2026-10-27');
test('starting implementation must preserve a concurrent saved descriptor edit (expected failure)', async () => {
  const source = await fs.readFile(path.join(evidence, 'starting-generation.js.txt'));
  const baseline = JSON.parse((await fs.readFile(path.join(evidence, 'initial-hashes.json'), 'utf8')).replace(/^\uFEFF/, ''));
  assert.equal(createHash('sha256').update(source).digest('hex').toUpperCase(), baseline['unreal-auto-setup\\generation.js']);
  const virtual = path.join(root, 'unreal-auto-setup/generation.js'), module = { exports: {} };
  vm.runInNewContext(source.toString(), { require: createRequire(virtual), module, Buffer, process });
  const f = await require('../../unreal-auto-setup/tests/helpers').fixture();
  try {
    const project = { root: f.root, filename: path.join(f.root, 'Game.uproject') };
    const newer = '{"EngineAssociation":"5.8","Description":"concurrent saved user edit"}';
    await module.exports.run(project, f.root, f.vscode, require('../../unreal-auto-setup/runtime').createState(), { run: () => ({ done: (async () => { await fs.writeFile(project.filename, newer); return { success: true, status: 'Succeeded' }; })() }) });
    assert.equal(await fs.readFile(project.filename, 'utf8'), newer);
  } finally { await f.cleanup(); }
});
