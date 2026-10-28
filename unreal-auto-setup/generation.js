'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const recovery = require('./generationRecovery');
const guard = require('./generationGuard');

async function tool(engine) {
  if (!engine) return undefined;
  for (const relative of [
    'Engine/Binaries/DotNET/UnrealBuildTool/UnrealBuildTool.exe',
    'Engine/Binaries/DotNET/UnrealBuildTool.exe'
  ]) {
    const filename = path.join(engine, relative);
    try {
      if ((await fs.stat(filename)).isFile()) return filename;
    } catch {}
  }
  return undefined;
}
async function specification(engine, project) {
  const executable = await tool(engine);
  if (!executable)
    throw new Error(
      'Engine-local UnrealBuildTool.exe not found. Build/install this engine’s UnrealBuildTool before regenerating.'
    );
  return {
    kind: 'generation',
    engine,
    project: project.filename,
    cwd: project.root,
    executable,
    args: ['-projectfiles', '-project=' + project.filename, '-game', '-progress', '-vscode']
  };
}
async function snapshot(project, vscode, engine) {
  const saved = new Map();
  const relative = filename => path.relative(project.root, filename);
  if (
    (vscode.workspace.textDocuments || []).some(
      doc =>
        doc.isDirty &&
        !relative(doc.uri.fsPath).startsWith('..') &&
        !path.isAbsolute(relative(doc.uri.fsPath))
    )
  )
    throw new Error('Save open project documents before regenerating project files.');
  async function visit(filename) {
    if ((vscode.workspace.textDocuments || []).some(doc => doc.isDirty && doc.uri.fsPath === filename))
      throw new Error('Save configuration before regeneration: ' + filename);
    let stat;
    try {
      stat = await fs.lstat(filename);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    if (stat.isSymbolicLink())
      throw new Error('Project generation skipped: symbolic link ' + relative(filename));
    if (stat.isDirectory()) {
      for (const entry of await fs.readdir(filename)) await visit(path.join(filename, entry));
    } else if (stat.isFile()) saved.set(filename, await fs.readFile(filename));
  }
  // UBT's VS Code generator can overwrite these; preserve all existing VS Code files.
  await visit(path.join(project.root, '.vscode'));
  await visit(path.join(project.root, '.clang-format'));
  await visit(project.filename);
  await visit(path.join(project.root, '.ignore'));
  for (const name of await fs.readdir(project.root))
    if (name.endsWith('.code-workspace')) await visit(path.join(project.root, name));
  // The engine's VS Code generator may also write its provider configuration.
  if (engine && path.resolve(engine) !== path.resolve(project.root))
    await visit(path.join(engine, '.vscode'));
  return saved;
}
async function restore(saved) {
  const conflicts = [];
  for (const [filename, content] of saved) {
    let current;
    let ancestor = filename;
    while (true) {
      try {
        if ((await fs.lstat(ancestor)).isSymbolicLink())
          throw new Error('Cannot restore configuration through a symbolic link: ' + filename);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      const parent = path.dirname(ancestor);
      if (parent === ancestor) break;
      ancestor = parent;
    }
    try {
      current = await fs.readFile(filename);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    // Compatibility export: comparison only. A read/check/write is not atomic CAS.
    if (!current?.equals(content))
      conflicts.push({ path: filename, reason: 'Changed or removed; automatic restoration refused' });
  }
  return { status: conflicts.length ? 'Conflict' : 'Unchanged', conflicts };
}
async function run(
  project,
  engine,
  vscode,
  state,
  builds,
  {
    automatic = false,
    onCancellation,
    storageRoot,
    io = fs,
    limits = recovery.defaults,
    watchFactory,
    checkpoint = async () => {}
  } = {}
) {
  if (!vscode.workspace.isTrusted) throw new Error('Trust the workspace before project generation.');
  const release = guard.acquire(
    [project.root, ...(engine ? [path.join(engine, '.vscode')] : [])],
    'generation'
  );
  const started = performance.now();
  let transaction, baseline, observer, filesystem;
  const selection = () => vscode.workspace.getConfiguration?.().get('unrealEngine.defaultProject');
  let selected;
  const currentWorkspace = () =>
    selection() === selected &&
    (!vscode.workspace.workspaceFolders ||
      (vscode.workspace.workspaceFolders.length === 1 &&
        path.resolve(vscode.workspace.workspaceFolders[0].uri.fsPath) === path.resolve(project.root)));
  try {
    selected = selection();
    const pending = await recovery.unresolved(storageRoot, project, engine, { io, limits });
    if (pending.length) {
      const first = pending[0];
      const result = {
        success: false,
        status: 'Blocked',
        reason:
          'Unresolved regeneration recovery requires review: ' + first.location + '. No UBT process started.',
        execution: { success: false, status: 'NotStarted' },
        preservation: {
          status: 'Conflict',
          operationId: first.operationId,
          recoveryLocation: first.location,
          priorTransactions: pending,
          conflicts: [{ path: project.filename, reason: 'Prior recovery data remains unresolved' }]
        }
      };
      state.get(project.filename).stale = true;
      state.get(project.filename).lastGeneration = result;
      return result;
    }
    observer = recovery.observe(vscode, project, engine, limits);
    filesystem = recovery.watchFilesystem(project, engine, { watchFactory, limits });
    const spec = await specification(engine, project);
    // Preserve the original dirty preflight, including documents outside the protected set.
    if (
      (vscode.workspace.textDocuments || []).some(
        doc => doc.isDirty && require('./paths').inside(project.root, doc.uri.fsPath)
      )
    )
      throw new Error('Save open project documents before regenerating project files.');
    baseline = await recovery.capture(project, engine, { io, limits });
    const revision = state.get(project.filename).revision;
    transaction = await recovery.begin(storageRoot, project, engine, baseline, { io, limits });
    await observer.connect(transaction);
    await checkpoint('beforeLaunch', transaction);
    const preflight = await recovery.capture(project, engine, { io, limits, strict: false });
    const early = recovery.differences(baseline, preflight);
    preflight.clear();
    let execution;
    if (early.length || observer.events.length || !vscode.workspace.isTrusted || !currentWorkspace())
      execution = {
        success: false,
        status: 'Blocked',
        reason: 'Project, trust or protected configuration changed before UBT launch'
      };
    else {
      try {
        filesystem.phase('Executing');
        execution = await builds.run({ ...spec, automatic, onCancellation }).done;
      } catch (error) {
        execution = { success: false, status: 'Failed', reason: error.message };
      }
    }
    filesystem.phase('PostExecution');
    await checkpoint('beforeFinalize', transaction);
    let current, readError;
    try {
      current = await recovery.capture(project, engine, { io, limits, strict: false });
      await transaction.snapshot(current, 'observed');
    } catch (error) {
      readError = error.message;
    }
    const documents = await observer.stop(transaction);
    const activity = filesystem.stop();
    try {
      await transaction.filesystem(activity);
    } catch (error) {
      readError = readError || error.message;
    }
    const conflicts = current ? recovery.differences(baseline, current) : [];
    conflicts.push(
      ...documents.events.map(item => ({
        path: item.path,
        reason: 'Observed VS Code document change; writer not inferred'
      }))
    );
    if (!currentWorkspace() || !vscode.workspace.isTrusted)
      conflicts.push({ path: project.filename, reason: 'Workspace or trust changed during generation' });
    if (readError || documents.error)
      conflicts.push({ path: project.filename, reason: readError || documents.error });
    const preservation = {
      status: readError || documents.error ? 'RecoveryFailed' : conflicts.length ? 'Conflict' : 'Unchanged',
      conflicts,
      metadataChanges: current ? recovery.metadataChanges(baseline, current) : [],
      filesystem: {
        eventCount: activity.events.length,
        complete: activity.complete,
        dropped: activity.dropped,
        errors: activity.errors,
        writerIdentityKnown: false,
        record: 'filesystem.json'
      },
      operationId: transaction.id,
      recoveryLocation: transaction.location,
      elapsedMs: performance.now() - started,
      recoveryBytes: transaction.bytes
    };
    let result = {
      ...execution,
      execution: { ...execution },
      preservation,
      success: !!execution.success && preservation.status === 'Unchanged'
    };
    if (!result.success && preservation.status !== 'Unchanged') {
      result.status = preservation.status;
      result.reason =
        'Automatic restoration refused. Review baseline/observed copies in ' +
        transaction.location +
        (execution.reason ? '. UBT: ' + execution.reason : '');
    }
    try {
      await transaction.finish(result);
    } catch (error) {
      result = {
        ...result,
        success: false,
        status: 'RecoveryFailed',
        reason: 'Recovery finalization failed: ' + error.message + '. Retained data: ' + transaction.location,
        preservation: { ...preservation, status: 'RecoveryFailed' }
      };
    }
    state.generated(project.filename, revision, result.success);
    if (!result.success) state.get(project.filename).stale = true;
    state.get(project.filename).lastGeneration = result;
    return result;
  } catch (error) {
    state.get(project.filename).stale = true;
    if (transaction) error.message += ' Retained recovery data: ' + transaction.location;
    throw error;
  } finally {
    try {
      observer?.dispose();
    } finally {
      filesystem?.dispose();
      baseline?.clear();
      release();
    }
  }
}
module.exports = { tool, specification, snapshot, restore, run };
