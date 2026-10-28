'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { classFixture } = require('./classHelpers');

test('activation preserves public commands and the internal dependency action after service extraction', async () => {
  const f = await classFixture();
  f.vscode.window.createOutputChannel = () => ({ appendLine() {}, show() {}, dispose() {} });
  f.values['unrealSetup.autoSetup'] = false;
  const sandbox = {
    require(name) {
      if (name === 'vscode') return f.vscode;
      if (name === './processes')
        return {
          ...require('../processes'),
          createService: () => ({ get: async () => ({ state: 'Stopped', matches: [] }) })
        };
      return name.startsWith('./') ? require('../' + name.slice(2)) : require(name);
    },
    module: { exports: {} },
    process,
    console
  };
  try {
    vm.runInNewContext(await fs.readFile(path.join(__dirname, '..', 'extension.js'), 'utf8'), sandbox);
    const runtime = await sandbox.module.exports.activate(f.context);
    // applyDependency is the existing internal Quick Fix command, intentionally absent from the palette.
    const expected = [
      ...require('../package.json').contributes.commands.map(item => item.command),
      'unrealSetup.applyDependency'
    ].sort();
    assert.deepEqual([...f.commands.keys()].sort(), expected);
    assert.equal(f.buttons.length, 2);
    assert.equal(runtime.snapshot().project.filename, f.project.filename);
  } finally {
    for (const disposable of f.context.subscriptions) disposable.dispose();
    await f.cleanup();
  }
});
