'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const generation = require('../generation');
const recovery = require('../generationRecovery');
const { fixture } = require('./helpers');
const { createState } = require('../runtime');
async function scenario(action) {
  const f = await fixture(),
    project = { root: f.root, filename: path.join(f.root, 'Game.uproject') };
  const state = createState(),
    storageRoot = path.join(f.root, '.recovery');
  const run = (work = async () => {}, options = {}) =>
    generation.run(
      project,
      f.root,
      f.vscode,
      state,
      {
        run: () => ({
          done: (async () => {
            await work();
            return { success: true, status: 'Succeeded', exitCode: 0 };
          })()
        })
      },
      { storageRoot, ...options }
    );
  try {
    await action({ ...f, project, state, storageRoot, run });
  } finally {
    await f.cleanup();
  }
}
test('metadata-only touch needs no restoration and must not invent a content conflict', () =>
  scenario(async e => {
    const initial = await fs.readFile(e.project.filename);
    const result = await e.run(() => fs.utimes(e.project.filename, new Date(1000), new Date(2000)));
    assert.equal(result.success, true);
    assert.equal(result.preservation.status, 'Unchanged');
    assert.deepEqual(await fs.readFile(e.project.filename), initial);
    assert.equal(result.preservation.metadataChanges.length, 1);
  }));
test('unresolved prior conflict cannot be silently completed by an unchanged retry', () =>
  scenario(async e => {
    const first = await e.run(() => fs.writeFile(e.project.filename, 'newer user bytes'));
    const before = await fs.readFile(path.join(first.preservation.recoveryLocation, 'result.json'));
    let launches = 0;
    const second = await e.run(() => {
      launches++;
    });
    assert.equal(launches, 0);
    assert.equal(second.status, 'Blocked');
    assert.equal(second.success, false);
    assert.equal(second.preservation.recoveryLocation, first.preservation.recoveryLocation);
    assert.deepEqual(
      await fs.readFile(path.join(first.preservation.recoveryLocation, 'result.json')),
      before
    );
    assert.equal(await fs.readFile(e.project.filename, 'utf8'), 'newer user bytes');
  }));
test('filesystem observations are bounded hints, never a writer identity', () =>
  scenario(async e => {
    const callbacks = [];
    const watchFactory = (root, options, callback) => {
      callbacks.push({ root, callback });
      return {
        on() {
          return this;
        },
        close() {}
      };
    };
    const result = await e.run(
      () => {
        callbacks[0].callback('change', 'Game.uproject');
      },
      { watchFactory }
    );
    assert.equal(result.success, true);
    assert.equal(result.preservation.filesystem.eventCount, 1);
    assert.equal(result.preservation.filesystem.writerIdentityKnown, false);
    const record = JSON.parse(
      await fs.readFile(path.join(result.preservation.recoveryLocation, 'filesystem.json'), 'utf8')
    );
    assert.equal(record.events[0].path, e.project.filename);
  }));
test('repeated unchanged operations use new journals without modifying previous evidence', () =>
  scenario(async e => {
    const first = await e.run(),
      bytes = await fs.readFile(path.join(first.preservation.recoveryLocation, 'result.json'));
    const second = await e.run();
    assert.equal(first.success, true);
    assert.equal(second.success, true);
    assert.notEqual(first.preservation.operationId, second.preservation.operationId);
    assert.notEqual(first.preservation.recoveryLocation, second.preservation.recoveryLocation);
    assert.deepEqual(await fs.readFile(path.join(first.preservation.recoveryLocation, 'result.json')), bytes);
  }));
test('completed successful journal does not bypass the existing storage quota', () =>
  scenario(async e => {
    const limits = { ...recovery.defaults, transactions: 1 };
    const first = await e.run(undefined, { limits });
    assert.equal(first.success, true);
    await assert.rejects(
      e.run(() => assert.fail('quota must refuse launch'), { limits }),
      /recovery limit/
    );
    assert.equal((await fs.readdir(e.storageRoot)).length, 1);
  }));
test('corrupt prior result blocks rather than silently discarding a conflict', () =>
  scenario(async e => {
    const first = await e.run();
    const filename = path.join(first.preservation.recoveryLocation, 'result.json');
    await fs.writeFile(filename, '{partial');
    const next = await e.run(() => assert.fail('must not launch'));
    assert.equal(next.status, 'Blocked');
    assert.equal(await fs.readFile(filename, 'utf8'), '{partial');
    assert.equal(next.preservation.priorTransactions[0].status, 'Incomplete');
  }));
test('mismatched operation identity in recovery result is blocked', () =>
  scenario(async e => {
    const first = await e.run(),
      filename = path.join(first.preservation.recoveryLocation, 'result.json');
    const result = JSON.parse(await fs.readFile(filename, 'utf8'));
    result.operationId = 'wrong-operation';
    await fs.writeFile(filename, JSON.stringify(result));
    assert.equal((await e.run(() => assert.fail('must not launch'))).status, 'Blocked');
  }));
test('recovery read permission failure blocks launch and preserves retained artifacts', () =>
  scenario(async e => {
    const first = await e.run();
    const io = {
      ...fs,
      open: async (filename, flags) => {
        if (filename.endsWith('intent.json') && flags === 'r') throw new Error('injected read denied');
        return fs.open(filename, flags);
      }
    };
    const next = await e.run(() => assert.fail('must not launch'), { io });
    assert.equal(next.status, 'Blocked');
    assert.match(next.preservation.priorTransactions[0].reason, /denied/);
    assert.equal(
      (await fs.stat(path.join(first.preservation.recoveryLocation, 'baseline.json'))).isFile(),
      true
    );
  }));
test('project-only conflict does not block an unrelated project on the same engine', () =>
  scenario(async e => {
    await e.run(() => fs.writeFile(e.project.filename, 'new user content'));
    const pending = await recovery.unresolved(
      e.storageRoot,
      { root: path.join(e.root, 'Other'), filename: path.join(e.root, 'Other', 'Other.uproject') },
      e.root
    );
    assert.deepEqual(pending, []);
  }));
test('shared-engine configuration conflicts block only projects using that engine', () =>
  scenario(async e => {
    const engine = path.join(e.root, 'separate-engine'),
      baseline = await recovery.capture(e.project, engine);
    const tx = await recovery.begin(e.storageRoot, e.project, engine, baseline);
    await tx.finish({
      success: false,
      status: 'Conflict',
      execution: { success: true },
      preservation: {
        status: 'Conflict',
        conflicts: [{ path: path.join(engine, '.vscode/settings.json'), reason: 'unknown writer' }]
      }
    });
    const other = {
      root: path.join(e.root, 'Other'),
      filename: path.join(e.root, 'Other', 'Other.uproject')
    };
    assert.equal((await recovery.unresolved(e.storageRoot, other, engine)).length, 1);
    assert.deepEqual(
      await recovery.unresolved(e.storageRoot, other, path.join(e.root, 'unrelated-engine')),
      []
    );
  }));
test('filesystem event quota remains bounded and reports dropped observations', () =>
  scenario(async e => {
    let change;
    const watchFactory = (root, options, callback) => {
      if (root === e.root) change = callback;
      return {
        on() {
          return this;
        },
        close() {}
      };
    };
    const result = await e.run(
      () => {
        for (let count = 0; count < 4; count++) change('change', 'Game.uproject');
      },
      { watchFactory, limits: { ...recovery.defaults, filesystemEvents: 1 } }
    );
    assert.equal(result.success, true);
    assert.equal(result.preservation.filesystem.eventCount, 1);
    assert.equal(result.preservation.filesystem.dropped, 3);
    assert.equal(result.preservation.filesystem.complete, false);
  }));
test('watcher failure is explicit incomplete telemetry, never permission to restore', () =>
  scenario(async e => {
    const watchFactory = () => {
      throw new Error('watch unavailable');
    };
    const result = await e.run(() => fs.writeFile(e.project.filename, 'external write'), { watchFactory });
    assert.equal(result.status, 'Conflict');
    assert.equal(result.preservation.filesystem.complete, false);
    assert.equal(await fs.readFile(e.project.filename, 'utf8'), 'external write');
  }));
test('filesystem evidence persistence failure cannot report full success', () =>
  scenario(async e => {
    const io = {
      ...fs,
      open: async (filename, flags) => {
        if (filename.endsWith('filesystem.json')) throw new Error('event journal failed');
        return fs.open(filename, flags);
      }
    };
    const result = await e.run(undefined, { io });
    assert.equal(result.status, 'RecoveryFailed');
    assert.equal(result.execution.success, true);
  }));
test('same-length changed bytes with baseline timestamps remain a content conflict', () =>
  scenario(async e => {
    const before = await fs.stat(e.project.filename),
      bytes = await fs.readFile(e.project.filename);
    const changed = Buffer.alloc(bytes.length, 120);
    const result = await e.run(async () => {
      await fs.writeFile(e.project.filename, changed);
      await fs.utimes(e.project.filename, before.atime, before.mtime);
    });
    assert.equal(result.status, 'Conflict');
    assert.deepEqual(await fs.readFile(e.project.filename), changed);
  }));
test('contradictory unchanged result with unresolved conflicts is not accepted', () =>
  scenario(async e => {
    const first = await e.run(),
      filename = path.join(first.preservation.recoveryLocation, 'result.json');
    const result = JSON.parse(await fs.readFile(filename, 'utf8'));
    result.preservation.conflicts = [{ path: e.project.filename, reason: 'unresolved' }];
    await fs.writeFile(filename, JSON.stringify(result));
    assert.equal((await e.run(() => assert.fail('must not launch'))).status, 'Blocked');
  }));
for (const status of ['Failed', 'Cancelled'])
  test(status + ' execution with unchanged protected bytes permits an ordinary retry', () =>
    scenario(async e => {
      const before = await recovery.capture(e.project, e.root),
        tx = await recovery.begin(e.storageRoot, e.project, e.root, before);
      await tx.finish({
        success: false,
        status,
        execution: { success: false, status },
        preservation: { status: 'Unchanged', conflicts: [] }
      });
      assert.equal((await e.run()).success, true);
    })
  );
