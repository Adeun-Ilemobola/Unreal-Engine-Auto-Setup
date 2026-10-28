'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const generation = require('../generation');
const recovery = require('../generationRecovery');
const guard = require('../generationGuard');
const { createState } = require('../runtime');
const { fixture } = require('./helpers');

async function setup(action) {
  const f = await fixture();
  const project = { root: f.root, filename: path.join(f.root, 'Game.uproject') };
  const state = createState(), storageRoot = path.join(f.root, '.recovery');
  const original = await fs.readFile(project.filename, 'utf8');
  const listeners = new Map();
  for (const name of ['onDidChangeTextDocument', 'onDidSaveTextDocument'])
    f.vscode.workspace[name] = fn => { listeners.set(name, fn); return { dispose: () => listeners.delete(name) }; };
  const env = { ...f, project, state, storageRoot, original,
    emit: (name, doc) => listeners.get(name)?.(name === 'onDidChangeTextDocument' ? { document: doc } : doc),
    run: (work = async () => {}, options = {}, execution = { success: true, status: 'Succeeded', exitCode: 0 }) =>
      generation.run(project, f.root, f.vscode, state, { run: () => ({ done: (async () => { await work(); return execution; })() }) }, { storageRoot, ...options })
  };
  try { await action(env); } finally { await f.cleanup(); }
}
async function json(filename) { return JSON.parse(await fs.readFile(filename, 'utf8')); }
async function versions(result, filename) {
  const root = result.preservation.recoveryLocation;
  const saved = [];
  for (const stage of ['baseline', 'observed']) {
    const manifest = await json(path.join(root, stage + '.json'));
    const entry = manifest.entries.find(item => item.path === filename);
    saved.push(entry?.blob ? await fs.readFile(path.join(root, entry.blob), 'utf8') : entry?.kind);
  }
  return saved;
}
test('ordinary unchanged generation preserves all protected bytes and clears stale', () => setup(async e => {
  e.state.mark(e.project, e.project.filename);
  const result = await e.run();
  assert.equal(result.success, true); assert.equal(result.preservation.status, 'Unchanged');
  assert.equal(e.state.get(e.project.filename).stale, false);
  assert.deepEqual(await versions(result, e.project.filename), [e.original, e.original]);
}));
test('ambiguous generator rewrite keeps current bytes and both recoverable versions', () => setup(async e => {
  const result = await e.run(() => fs.writeFile(e.project.filename, 'generator or external content'));
  assert.equal(result.status, 'Conflict'); assert.equal(result.execution.success, true); assert.equal(result.success, false);
  assert.equal(e.state.get(e.project.filename).stale, true);
  assert.deepEqual(await versions(result, e.project.filename), [e.original, 'generator or external content']);
  assert.equal(await fs.readFile(e.project.filename, 'utf8'), 'generator or external content');
}));
test('originally absent paths have explicit absence records', () => setup(async e => {
  const result = await e.run();
  assert.deepEqual(await versions(result, path.join(e.root, '.ignore')), ['absent', 'absent']);
}));
test('created protected file is retained and reported, never deleted as rollback', () => setup(async e => {
  const filename = path.join(e.root, '.ignore');
  const result = await e.run(() => fs.writeFile(filename, 'created'));
  assert.deepEqual(await versions(result, filename), ['absent', 'created']);
  assert.equal(await fs.readFile(filename, 'utf8'), 'created'); assert.equal(result.status, 'Conflict');
}));
test('new workspace file is discovered without scanning project content', () => setup(async e => {
  const filename = path.join(e.root, 'New.code-workspace');
  const result = await e.run(() => fs.writeFile(filename, '{}'));
  assert.equal(result.preservation.conflicts.some(item => item.path === filename), true);
  assert.deepEqual(await versions(result, filename), [undefined, '{}']);
}));
test('multiple changed protected files retain independent baseline and current copies', () => setup(async e => {
  const other = path.join(e.root, '.clang-format'); await fs.writeFile(other, 'format-before');
  const result = await e.run(async () => { await fs.writeFile(other, 'format-after'); await fs.writeFile(e.project.filename, 'descriptor-after'); });
  assert.deepEqual(await versions(result, other), ['format-before', 'format-after']);
  assert.deepEqual(await versions(result, e.project.filename), [e.original, 'descriptor-after']);
}));
for (const saved of [true, false]) test((saved ? 'saved' : 'unsaved') + ' VS Code edits persist as labeled document observations', () => setup(async e => {
  const doc = { uri: { fsPath: e.project.filename }, version: 1, isDirty: false, getText: () => text };
  let text = e.original; e.vscode.workspace.textDocuments = [doc];
  const result = await e.run(async () => {
    doc.version++; doc.isDirty = !saved; text = 'new editor text';
    e.emit(saved ? 'onDidSaveTextDocument' : 'onDidChangeTextDocument', doc);
    if (saved) await fs.writeFile(e.project.filename, text);
  });
  assert.equal(result.status, 'Conflict');
  const root = result.preservation.recoveryLocation, names = await fs.readdir(root);
  const documents = await Promise.all(names.filter(name => name.startsWith('document-')).map(name => json(path.join(root, name))));
  assert.equal(documents.some(item => item.text === 'new editor text' && item.version === 2), true);
  if (!saved) assert.equal(await fs.readFile(e.project.filename, 'utf8'), e.original);
}));
test('multiple successive document versions survive even when final disk returns to baseline', () => setup(async e => {
  const result = await e.run(async () => {
    for (const version of [1, 2, 3]) e.emit('onDidChangeTextDocument', { uri: { fsPath: e.project.filename }, version, isDirty: true, getText: () => 'version-' + version });
  });
  assert.equal(result.status, 'Conflict');
  const root = result.preservation.recoveryLocation;
  const docs = await Promise.all((await fs.readdir(root)).filter(name => name.startsWith('document-')).map(name => json(path.join(root, name))));
  assert.deepEqual(docs.map(item => item.text), ['version-1', 'version-2', 'version-3']);
}));
test('pre-launch edit aborts without starting UBT and retains changed content', () => setup(async e => {
  const result = await e.run(() => assert.fail('UBT must not launch'), { checkpoint: async stage => { if (stage === 'beforeLaunch') await fs.writeFile(e.project.filename, 'prelaunch'); } });
  assert.equal(result.execution.status, 'Blocked'); assert.equal(result.status, 'Conflict');
  assert.deepEqual(await versions(result, e.project.filename), [e.original, 'prelaunch']);
}));
test('post-UBT/pre-finalization edit is not overwritten', () => setup(async e => {
  const result = await e.run(undefined, { checkpoint: async stage => { if (stage === 'beforeFinalize') await fs.writeFile(e.project.filename, 'late saved edit'); } });
  assert.equal(await fs.readFile(e.project.filename, 'utf8'), 'late saved edit'); assert.equal(result.status, 'Conflict');
}));
test('deletion has a recovery tombstone and does not recreate the file', () => setup(async e => {
  const result = await e.run(() => fs.unlink(e.project.filename));
  assert.deepEqual(await versions(result, e.project.filename), [e.original, 'absent']);
  await assert.rejects(fs.stat(e.project.filename), { code: 'ENOENT' });
}));
test('replacement with equal bytes still reports changed identity', () => setup(async e => {
  const result = await e.run(async () => { await fs.rename(e.project.filename, e.project.filename + '.old'); await fs.writeFile(e.project.filename, e.original); });
  assert.equal(result.status, 'Conflict'); assert.match(result.preservation.conflicts[0].reason, /identity/);
}));
test('symlink replacement refuses dereference or restoration', () => setup(async e => {
  const target = path.join(e.root, 'outside'); await fs.mkdir(target); await fs.writeFile(path.join(target, 'keep'), 'untouched');
  const result = await e.run(async () => { await fs.unlink(e.project.filename); await fs.symlink(target, e.project.filename, process.platform === 'win32' ? 'junction' : 'dir'); });
  assert.equal(result.status, 'Conflict'); assert.equal(await fs.readFile(path.join(target, 'keep'), 'utf8'), 'untouched');
}));
test('hard-link replacement is unreadable/unsafe and never written through', () => setup(async e => {
  const target = path.join(e.root, 'keep'); await fs.writeFile(target, 'external');
  const result = await e.run(async () => { await fs.unlink(e.project.filename); await fs.link(target, e.project.filename); });
  assert.equal(result.status, 'Conflict'); assert.equal(await fs.readFile(target, 'utf8'), 'external');
  assert.deepEqual(await versions(result, e.project.filename), [e.original, 'unreadable']);
}));
test('unexpected directory at protected file location is never replaced', () => setup(async e => {
  const result = await e.run(async () => { await fs.unlink(e.project.filename); await fs.mkdir(e.project.filename); await fs.writeFile(path.join(e.project.filename, 'keep'), 'keep'); });
  assert.equal(result.status, 'Conflict'); assert.equal(await fs.readFile(path.join(e.project.filename, 'keep'), 'utf8'), 'keep');
}));
test('permission failure before launch refuses UBT', () => setup(async e => {
  const io = { ...fs, open: async (filename, flags) => { if (filename === e.project.filename) throw new Error('injected EACCES'); return fs.open(filename, flags); } };
  await assert.rejects(e.run(() => assert.fail('must not run'), { io }), /EACCES/);
}));
test('partial protected read before launch fails closed', () => setup(async e => {
  const io = { ...fs, open: async (filename, flags) => {
    const handle = await fs.open(filename, flags);
    return filename === e.project.filename ? { stat: () => handle.stat(), close: () => handle.close(), read: async () => ({ bytesRead: 0 }) } : handle;
  } };
  await assert.rejects(e.run(() => assert.fail('must not run'), { io }), /Partial/);
}));
test('recovery baseline write failure aborts before UBT and preserves live file', () => setup(async e => {
  const io = { ...fs, open: async (filename, flags) => { if (path.basename(filename) === 'baseline.json') throw new Error('disk full'); return fs.open(filename, flags); } };
  await assert.rejects(e.run(() => assert.fail('must not run'), { io }), /disk full.*Recovery data/);
  assert.equal(await fs.readFile(e.project.filename, 'utf8'), e.original);
}));
test('post-run recovery write failure is not reported successful', () => setup(async e => {
  const io = { ...fs, open: async (filename, flags) => { if (path.basename(filename) === 'observed.json') throw new Error('injected write failure'); return fs.open(filename, flags); } };
  const result = await e.run(() => fs.writeFile(e.project.filename, 'current'), { io });
  assert.equal(result.status, 'RecoveryFailed'); assert.equal(result.execution.success, true);
  assert.equal(await fs.readFile(e.project.filename, 'utf8'), 'current');
  assert.equal((await json(path.join(result.preservation.recoveryLocation, 'baseline.json'))).project, e.project.filename);
}));
test('partial recovery blob write leaves baseline and explicit recovery failure', () => setup(async e => {
  const io = { ...fs, open: async (filename, flags) => {
    const handle = await fs.open(filename, flags);
    if (!path.basename(filename).startsWith('observed-')) return handle;
    return { close: () => handle.close(), sync: () => handle.sync(), writeFile: async content => { await handle.writeFile(content.subarray(0, 1)); throw new Error('partial write'); } };
  } };
  const result = await e.run(() => fs.writeFile(e.project.filename, 'new'), { io });
  assert.equal(result.status, 'RecoveryFailed'); assert.equal(await fs.readFile(e.project.filename, 'utf8'), 'new');
}));
test('final manifest failure returns RecoveryFailed without hiding UBT failure', () => setup(async e => {
  const io = { ...fs, open: async (filename, flags) => { if (path.basename(filename) === 'result.json') throw new Error('manifest failure'); return fs.open(filename, flags); } };
  const result = await e.run(undefined, { io }, { success: false, status: 'Failed', exitCode: 6, reason: 'compiler/tool failed' });
  assert.equal(result.status, 'RecoveryFailed'); assert.equal(result.execution.exitCode, 6); assert.equal(result.success, false);
}));
for (const status of ['Failed', 'Cancelled']) test(status + ' UBT does not trigger unsafe restoration', () => setup(async e => {
  const result = await e.run(() => fs.writeFile(e.project.filename, 'newer'), {}, { success: false, status, exitCode: status === 'Failed' ? 6 : null });
  assert.equal(result.execution.status, status); assert.equal(result.status, 'Conflict'); assert.equal(await fs.readFile(e.project.filename, 'utf8'), 'newer');
}));
test('rejected managed child preserves its original error and recovery', () => setup(async e => {
  const result = await e.run(() => { throw new Error('spawn rejected'); });
  assert.equal(result.status, 'Failed'); assert.match(result.execution.reason, /spawn rejected/);
  assert.equal(result.preservation.status, 'Unchanged');
}));
test('workspace switch retains exact operation/project association without writes', () => setup(async e => {
  const result = await e.run(() => { e.vscode.workspace.workspaceFolders = []; });
  assert.equal(result.status, 'Conflict');
  const manifest = await json(path.join(result.preservation.recoveryLocation, 'result.json'));
  assert.equal(manifest.project, e.project.filename);
}));
test('trust loss during cancellation leaves live newer file and original recovery copy', () => setup(async e => {
  const result = await e.run(async () => { e.vscode.workspace.isTrusted = false; await fs.writeFile(e.project.filename, 'new'); }, {}, { success: false, status: 'Cancelled' });
  assert.equal(result.status, 'Conflict'); assert.deepEqual(await versions(result, e.project.filename), [e.original, 'new']);
}));
test('repeated regeneration and extension-owned mutations are excluded while active', () => setup(async e => {
  const result = await e.run(async () => {
    await assert.rejects(e.run(), /already active/);
    await assert.rejects(guard.mutate([e.root], () => assert.fail('mutation must not run')), /already active/);
    const release = guard.acquire([path.join(path.dirname(e.root), 'unrelated-project')]); release();
  });
  assert.equal(result.success, true);
  const release = guard.acquire([e.root]); release();
}));
test('module and plugin commits refuse active generation before creating files', () => setup(async e => {
  const creation = require('../creation');
  const modulePlan = await creation.plan(e.project, { name: 'TestModule' });
  const pluginPlan = await creation.plan(e.project, { name: 'TestPlugin', kind: 'plugin' });
  await e.run(async () => {
    for (const plan of [modulePlan, pluginPlan]) {
      await assert.rejects(creation.commit(plan, e.vscode), /already active/);
      await assert.rejects(fs.stat(plan.newRoot), { code: 'ENOENT' });
    }
  });
}));
test('setup file and engine setting writes refuse generation lease', () => setup(async e => {
  await e.run(async () => {
    await assert.rejects(require('../core').writeNew(path.join(e.root, '.clang-format'), 'new'), /already active/);
    await assert.rejects(require('../engine').remember(e.vscode, { ...e.project, config: { get: () => undefined } }, { path: e.root }), /already active/);
  });
}));
test('mutation active before regeneration refuses launch', () => setup(async e => {
  const release = guard.acquire([e.root]);
  try { await assert.rejects(e.run(() => assert.fail('must not run')), /already active/); } finally { release(); }
}));
test('interrupted journal remains recoverable; retry never replays or overwrites it', () => setup(async e => {
  let location;
  await assert.rejects(e.run(undefined, { checkpoint: async (stage, tx) => { if (stage === 'beforeLaunch') { location = tx.location; throw new Error('simulated interruption'); } } }), /interruption/);
  const initial = await fs.readFile(path.join(location, 'baseline.json'));
  await assert.rejects(fs.stat(path.join(location, 'result.json')), { code: 'ENOENT' });
  const result = await e.run(()=>assert.fail('incomplete recovery must block launch'));
  assert.equal(result.status,'Blocked'); assert.equal(result.preservation.recoveryLocation, location);
  assert.deepEqual(await fs.readFile(path.join(location, 'baseline.json')), initial);
}));
test('bounded recovery slots refuse launch without deleting unresolved data', () => setup(async e => {
  const limits = { ...recovery.defaults, transactions: 1 };
  const first = await e.run(() => fs.writeFile(e.project.filename, 'conflict'), { limits });
  const second=await e.run(() => assert.fail('must not run'), { limits });
  assert.equal(second.status,'Blocked');assert.equal(second.success,false);
  assert.deepEqual(await versions(first, e.project.filename), [e.original, 'conflict']);
}));
test('oversized protected file refuses UBT before allocation', () => setup(async e => {
  await assert.rejects(e.run(() => assert.fail('must not run'), { limits: { ...recovery.defaults, fileBytes: 1 } }), /oversized/);
}));
test('document observation quota reports incomplete evidence, never full success', () => setup(async e => {
  const result = await e.run(() => { for (let version = 1; version <= 3; version++) e.emit('onDidSaveTextDocument', { uri: { fsPath: e.project.filename }, version, getText: () => 'v' + version }); }, { limits: { ...recovery.defaults, documents: 1 } });
  assert.equal(result.status, 'RecoveryFailed');
}));
test('compatibility restore export never writes during a check/write race or a missing file', () => setup(async e => {
  const saved = new Map([[e.project.filename, Buffer.from(e.original)]]);
  await fs.writeFile(e.project.filename, 'late');
  assert.equal((await generation.restore(saved)).status, 'Conflict'); assert.equal(await fs.readFile(e.project.filename, 'utf8'), 'late');
  await fs.unlink(e.project.filename);
  assert.equal((await generation.restore(saved)).status, 'Conflict'); await assert.rejects(fs.stat(e.project.filename), { code: 'ENOENT' });
}));
test('shared engine configuration is captured with a stub engine, never the installed engine', () => setup(async e => {
  const engine = path.join(e.root, 'stub-engine'), settings = path.join(engine, '.vscode/settings.json');
  await fs.mkdir(path.dirname(settings), { recursive: true }); await fs.writeFile(settings, 'engine baseline');
  const first = await recovery.capture(e.project, engine);
  await fs.writeFile(settings, 'external engine edit');
  const after = await recovery.capture(e.project, engine);
  assert.equal(recovery.differences(first, after).some(item => item.path === settings), true);
  assert.equal(await fs.readFile(settings, 'utf8'), 'external engine edit');
}));
test('missing extension storage fails closed before managed process creation', () => setup(async e => {
  await assert.rejects(e.run(() => assert.fail('must not run'), { storageRoot: undefined }), /storage is unavailable/);
}));
test('same-folder descriptor selection change is an operation conflict', () => setup(async e => {
  const result = await e.run(() => { e.values['unrealEngine.defaultProject'] = 'Other.uproject'; });
  assert.equal(result.status, 'Conflict'); assert.equal(await fs.readFile(e.project.filename, 'utf8'), e.original);
}));
test('document observation failure reports incomplete evidence and releases its lease', () => setup(async e => {
  const result = await e.run(() => e.emit('onDidSaveTextDocument', { uri: { fsPath: e.project.filename }, getText() { throw new Error('document unavailable'); } }));
  assert.equal(result.status, 'RecoveryFailed');
  const release = guard.acquire([e.root]); release();
}));
test('document artifact write failure keeps baseline and returns recovery failure', () => setup(async e => {
  const io = { ...fs, open: async (filename, flags) => { if (path.basename(filename).startsWith('document-')) throw new Error('document journal full'); return fs.open(filename, flags); } };
  const result = await e.run(() => e.emit('onDidSaveTextDocument', { uri: { fsPath: e.project.filename }, version: 2, getText: () => 'saved' }), { io });
  assert.equal(result.status, 'RecoveryFailed');
  assert.equal((await json(path.join(result.preservation.recoveryLocation, 'baseline.json'))).project, e.project.filename);
}));
test('recovery storage in protected configuration is refused before launch', () => setup(async e => {
  await assert.rejects(e.run(() => assert.fail('must not run'), { storageRoot: path.join(e.root, '.vscode/recovery') }), /outside protected/);
}));
test('two allocators cannot exceed the exclusive recovery slot bound', () => setup(async e => {
  const baseline = await recovery.capture(e.project, e.root), limits = { ...recovery.defaults, transactions: 1 };
  const results = await Promise.allSettled([1, 2].map(() => recovery.begin(e.storageRoot, e.project, e.root, baseline, { limits })));
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(results.filter(item => item.status === 'rejected').length, 1);
  assert.equal((await fs.readdir(e.storageRoot)).length, 1);
}));
test('disposal-triggered cancellation does not free generation exclusion before child completion', () => setup(async e => {
  let complete, started;
  const ready = new Promise(resolve => { started = resolve; });
  const running = generation.run(e.project, e.root, e.vscode, e.state, { run: () => { started(); return { done: new Promise(resolve => { complete = resolve; }) }; } }, { storageRoot: e.storageRoot });
  await ready;
  // Simulated build-service dispose/cancel acknowledgement. Real service lifetime is separately tested.
  assert.throws(() => guard.acquire([e.root]), /already active/);
  complete({ success: false, status: 'Cancelled', cancellation: { state: 'Exited' } });
  assert.equal((await running).status, 'Cancelled');
  const release = guard.acquire([e.root]); release();
}));
test('configuration-read failure releases the regeneration lease', () => setup(async e => {
  e.vscode.workspace.getConfiguration = () => { throw new Error('configuration unavailable'); };
  await assert.rejects(e.run(() => assert.fail('must not launch')), /configuration unavailable/);
  const release = guard.acquire([e.root]); release();
}));
