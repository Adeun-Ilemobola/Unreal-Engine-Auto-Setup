'use strict';
const fs = require('node:fs/promises');
const nativeWatch = require('node:fs').watch;
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const safe = require('./classFiles');
const defaults = Object.freeze({
  entries: 512,
  fileBytes: 8 * 1024 * 1024,
  transactionBytes: 32 * 1024 * 1024,
  transactions: 32,
  documents: 64,
  filesystemEvents: 256
});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = filename =>
  process.platform === 'win32' ? path.resolve(filename).toLowerCase() : path.resolve(filename);
const identity = stat => ({
  dev: stat.dev,
  ino: stat.ino,
  nlink: stat.nlink,
  size: stat.size,
  mtimeMs: stat.mtimeMs,
  ctimeMs: stat.ctimeMs
});
function protectedPath(project, engine, filename) {
  const file = canonical(filename),
    root = canonical(project.root);
  return (
    file === canonical(project.filename) ||
    ['.clang-format', '.ignore'].some(name => file === canonical(path.join(root, name))) ||
    (path.dirname(file) === root && file.endsWith('.code-workspace')) ||
    [path.join(root, '.vscode'), engine && path.join(engine, '.vscode')]
      .filter(Boolean)
      .some(dir => file === canonical(dir) || file.startsWith(canonical(dir) + path.sep))
  );
}

// Reads only; a comparison never authorizes a write back to a protected path.
async function capture(project, engine, { io = fs, strict = true, limits = defaults } = {}) {
  const records = new Map();
  let bytes = 0;
  async function visit(filename) {
    filename = path.resolve(filename);
    if (records.has(filename)) return;
    if (records.size >= limits.entries) throw new Error('Protected-file inventory limit reached');
    records.set(filename, { path: filename, kind: 'pending' });
    try {
      await safe.safeAncestors(filename, io);
      let stat;
      try {
        stat = await io.lstat(filename);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        records.set(filename, { path: filename, kind: 'absent' });
        return;
      }
      if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink !== 1))
        throw new Error('Unsafe symbolic link or hard link: ' + filename);
      if (stat.isDirectory()) {
        records.set(filename, { path: filename, kind: 'directory', identity: identity(stat) });
        for (const entry of await io.readdir(filename)) await visit(path.join(filename, entry));
      } else {
        if (!stat.isFile() || stat.size > limits.fileBytes)
          throw new Error('Unsupported or oversized protected file: ' + filename);
        const handle = await io.open(filename, 'r');
        let content, opened, after;
        try {
          opened = await handle.stat();
          if (
            !opened.isFile() ||
            opened.nlink !== 1 ||
            opened.ino !== stat.ino ||
            opened.dev !== stat.dev ||
            opened.size > limits.fileBytes
          )
            throw new Error('Protected file replaced before read: ' + filename);
          // A bounded read cannot allocate an unbounded buffer if an external file grows.
          content = Buffer.alloc(opened.size);
          let offset = 0;
          while (offset < content.length) {
            const read = await handle.read(content, offset, content.length - offset, offset);
            if (!read.bytesRead) throw new Error('Partial protected-file read: ' + filename);
            offset += read.bytesRead;
          }
          after = await handle.stat();
        } finally {
          await handle.close();
        }
        await safe.safeAncestors(filename, io);
        const current = await io.lstat(filename);
        if (
          JSON.stringify(identity(opened)) !== JSON.stringify(identity(after)) ||
          JSON.stringify(identity(after)) !== JSON.stringify(identity(current))
        )
          throw new Error('Protected file changed during read: ' + filename);
        bytes += content.length;
        if (bytes > limits.transactionBytes / 2) throw new Error('Protected snapshot byte limit reached');
        records.set(filename, {
          path: filename,
          kind: 'file',
          identity: identity(after),
          sha256: hash(content),
          content
        });
      }
    } catch (error) {
      if (strict) throw error;
      records.set(filename, { path: filename, kind: 'unreadable', error: error.message });
    }
  }
  for (const filename of [
    path.join(project.root, '.vscode'),
    path.join(project.root, '.vscode/settings.json'),
    path.join(project.root, '.vscode/tasks.json'),
    path.join(project.root, '.vscode/c_cpp_properties.json'),
    path.join(project.root, '.clang-format'),
    project.filename,
    path.join(project.root, '.ignore')
  ])
    await visit(filename);
  try {
    for (const name of await io.readdir(project.root))
      if (name.endsWith('.code-workspace')) await visit(path.join(project.root, name));
  } catch (error) {
    if (strict) throw error;
    records.set(project.root, { path: project.root, kind: 'unreadable', error: error.message });
  }
  if (engine && canonical(engine) !== canonical(project.root)) await visit(path.join(engine, '.vscode'));
  return records;
}
function differences(before, after) {
  const conflicts = [];
  for (const filename of new Set([...before.keys(), ...after.keys()])) {
    const b = before.get(filename),
      c = after.get(filename);
    let reason;
    if (c?.kind === 'unreadable') reason = c.error;
    else if (!b || b.kind === 'absent') {
      if (c && c.kind !== 'absent') reason = 'Created during generation; writer unknown';
    } else if (!c || c.kind === 'absent') reason = 'Removed during generation';
    else if (b.kind !== c.kind) reason = 'Protected path type changed';
    else if (
      b.identity?.dev !== c.identity?.dev ||
      b.identity?.ino !== c.identity?.ino ||
      b.identity?.nlink !== c.identity?.nlink
    )
      reason = 'Protected path identity changed';
    else if (b.kind === 'file' && b.sha256 !== c.sha256) reason = 'Content changed; writer unknown';
    if (reason) conflicts.push({ path: filename, reason });
  }
  return conflicts;
}
function metadataChanges(before, after) {
  return [...before.values()]
    .filter(b => {
      const c = after.get(b.path);
      return (
        b.kind === 'file' &&
        c?.kind === 'file' &&
        b.sha256 === c.sha256 &&
        b.identity.dev === c.identity.dev &&
        b.identity.ino === c.identity.ino &&
        b.identity.nlink === c.identity.nlink &&
        JSON.stringify(b.identity) !== JSON.stringify(c.identity)
      );
    })
    .map(b => ({
      path: b.path,
      reason: 'Observed metadata change with equal current bytes; no restoration needed; writer unknown'
    }));
}

// Delivery observations only. Quiet/error-free watching never grants write permission.
function watchFilesystem(project, engine, { watchFactory = nativeWatch, limits = defaults } = {}) {
  const events = [],
    errors = [],
    roots = [],
    watchers = [];
  let phase = 'Preparing',
    stopped = false,
    dropped = 0;
  for (const [root, recursive] of [
    [project.root, false],
    [path.join(project.root, '.vscode'), true],
    ...(engine && canonical(engine) !== canonical(project.root) ? [[path.join(engine, '.vscode'), true]] : [])
  ]) {
    try {
      const watcher = watchFactory(root, { recursive, persistent: false }, (type, name) => {
        if (stopped) return;
        if (name === null || name === undefined) {
          if (errors.length < 16) errors.push('Unknown filename delivered for ' + root);
          else dropped++;
          return;
        }
        const filename = path.resolve(root, String(name));
        if (!safe.inside(root, filename) || !protectedPath(project, engine, filename)) return;
        if (events.length >= (limits.filesystemEvents ?? defaults.filesystemEvents)) {
          dropped++;
          return;
        }
        events.push({
          sequence: events.length + 1,
          delivered: new Date().toISOString(),
          deliveryPhase: phase,
          type,
          path: filename
        });
      });
      watcher.on?.('error', error => {
        if (!stopped && errors.length < 16) errors.push(error.message);
      });
      watchers.push(watcher);
      roots.push({ path: root, recursive, available: true });
    } catch (error) {
      roots.push({ path: root, recursive, available: false, reason: error.code || error.message });
    }
  }
  function dispose() {
    if (stopped) return;
    stopped = true;
    for (const watcher of watchers) {
      try {
        watcher.close();
      } catch (error) {
        if (errors.length < 16) errors.push(error.message);
      }
    }
  }
  return {
    phase(value) {
      phase = value;
    },
    dispose,
    stop() {
      dispose();
      return {
        events,
        roots,
        errors,
        dropped,
        complete: !dropped && !errors.length && roots.every(root => root.available),
        writerIdentityKnown: false
      };
    }
  };
}

// Content-recovery gate only: no PID metadata, termination or process recovery.
async function unresolved(storageRoot, project, engine, { io = fs, limits = defaults } = {}) {
  if (!storageRoot) return [];
  try {
    await safe.safeAncestors(storageRoot, io);
    await io.lstat(storageRoot);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const found = [];
  async function read(filename) {
    await safe.safeAncestors(filename, io);
    const stat = await io.lstat(filename);
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > 1024 * 1024)
      throw new Error('Unsafe or oversized recovery metadata');
    const handle = await io.open(filename, 'r');
    try {
      const opened = await handle.stat();
      if (JSON.stringify(identity(opened)) !== JSON.stringify(identity(stat)))
        throw new Error('Recovery metadata replaced');
      const bytes = Buffer.alloc(opened.size);
      let offset = 0;
      while (offset < bytes.length) {
        const result = await handle.read(bytes, offset, bytes.length - offset, offset);
        if (!result.bytesRead) throw new Error('Partial recovery metadata');
        offset += result.bytesRead;
      }
      const final = await handle.stat();
      if (JSON.stringify(identity(opened)) !== JSON.stringify(identity(final)))
        throw new Error('Recovery metadata changed');
      return JSON.parse(bytes.toString('utf8'));
    } finally {
      await handle.close();
    }
  }
  for (let slot = 0; slot < limits.transactions; slot++) {
    const location = path.join(storageRoot, 'transaction-' + slot);
    let intent;
    try {
      try {
        await io.lstat(location);
      } catch (error) {
        if (error.code === 'ENOENT') continue;
        throw error;
      }
      intent = await read(path.join(location, 'intent.json'));
      if (intent.schema !== 1 || typeof intent.project !== 'string' || typeof intent.operationId !== 'string')
        throw new Error('Invalid recovery intent');
      const sameProject = canonical(intent.project) === canonical(project.filename);
      const sameEngine =
        typeof intent.engine === 'string' && engine && canonical(intent.engine) === canonical(engine);
      if (!sameProject && !sameEngine) continue;
      const result = await read(path.join(location, 'result.json'));
      if (
        result.schema !== 1 ||
        result.operationId !== intent.operationId ||
        result.project !== intent.project ||
        !result.preservation ||
        !Array.isArray(result.preservation.conflicts)
      )
        throw new Error('Invalid recovery result');
      if (result.preservation.status === 'Unchanged' && result.preservation.conflicts.length)
        throw new Error('Contradictory preservation result');
      if (['Conflict', 'RecoveryFailed'].includes(result.preservation.status)) {
        const sharedConflict =
          sameEngine &&
          Array.isArray(result.preservation.conflicts) &&
          result.preservation.conflicts.some(
            item =>
              typeof item.path === 'string' &&
              (canonical(item.path) === canonical(path.join(engine, '.vscode')) ||
                safe.inside(path.join(engine, '.vscode'), item.path))
          );
        if (sameProject || sharedConflict)
          found.push({ location, operationId: intent.operationId, status: result.preservation.status });
      } else if (result.preservation.status !== 'Unchanged') throw new Error('Unknown preservation outcome');
    } catch (error) {
      found.push({ location, operationId: intent?.operationId, status: 'Incomplete', reason: error.message });
    }
  }
  return found;
}
function document(doc) {
  return { path: doc.uri.fsPath, version: doc.version, dirty: !!doc.isDirty, text: doc.getText?.() };
}
function observe(vscode, project, engine, limits = defaults) {
  const initial = (vscode.workspace.textDocuments || [])
    .filter(doc => protectedPath(project, engine, doc.uri.fsPath))
    .map(document);
  const events = [],
    subscriptions = [];
  let error,
    sink,
    pending = Promise.resolve(),
    textBytes = 0;
  function changed(doc) {
    try {
      if (!protectedPath(project, engine, doc.uri.fsPath)) return;
      if (events.length >= limits.documents) {
        error = 'Document observation limit reached';
        return;
      }
      const item = document(doc);
      textBytes += Buffer.byteLength(item.text || '');
      if (textBytes > limits.fileBytes) {
        error = 'Document observation byte limit reached';
        return;
      }
      events.push(item);
      if (sink)
        pending = pending
          .then(() => sink(item))
          .catch(failure => {
            error = failure.message;
          });
    } catch (failure) {
      error = 'Document observation failed: ' + failure.message;
    }
  }
  for (const [name, extract] of [
    ['onDidChangeTextDocument', value => value.document],
    ['onDidSaveTextDocument', value => value]
  ])
    if (vscode.workspace[name]) subscriptions.push(vscode.workspace[name](value => changed(extract(value))));
  return {
    initial,
    events,
    async connect(transaction) {
      for (const item of initial) await transaction.document(item, 'initial');
      for (const item of events) await transaction.document(item, 'event');
      sink = item => transaction.document(item, 'event');
    },
    async stop(transaction) {
      subscriptions.forEach(item => item.dispose());
      await pending;
      for (const doc of vscode.workspace.textDocuments || [])
        if (protectedPath(project, engine, doc.uri.fsPath)) {
          const current = document(doc),
            original = initial.find(item => canonical(item.path) === canonical(current.path));
          if (
            current.dirty ||
            !original ||
            current.version !== original.version ||
            current.text !== original.text
          ) {
            if (events.length < limits.documents) {
              events.push(current);
              try {
                await transaction.document(current, 'final');
              } catch (failure) {
                error = failure.message;
              }
            } else error = 'Document observation limit reached';
          }
        }
      return { events: events.map(({ text, ...item }) => item), error };
    },
    dispose() {
      subscriptions.forEach(item => item.dispose());
    }
  };
}

async function begin(storageRoot, project, engine, baseline, { io = fs, limits = defaults } = {}) {
  if (!storageRoot) throw new Error('Extension-owned regeneration recovery storage is unavailable');
  if (protectedPath(project, engine, storageRoot))
    throw new Error('Recovery storage must be outside protected configuration');
  await safe.safeAncestors(storageRoot, io);
  await io.mkdir(storageRoot, { recursive: true });
  await safe.safeAncestors(storageRoot, io);
  if ((await io.readdir(storageRoot)).length >= limits.transactions)
    throw new Error(
      'Regeneration recovery limit reached at ' +
        storageRoot +
        '. Review/export retained transactions before removing resolved copies.'
    );
  const id = randomUUID();
  let location;
  // Fixed exclusive slots bound storage even with simultaneous allocating hosts.
  for (let slot = 0; slot < limits.transactions; slot++) {
    const candidate = path.join(storageRoot, 'transaction-' + slot);
    try {
      await io.mkdir(candidate);
      location = candidate;
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  if (!location) throw new Error('Regeneration recovery slots exhausted at ' + storageRoot);
  let bytes = 0,
    sequence = 0;
  async function write(name, value) {
    const content = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2));
    bytes += content.length;
    if (bytes > limits.transactionBytes) throw new Error('Regeneration recovery byte limit reached');
    await safe.safeAncestors(location, io);
    const handle = await io.open(path.join(location, name), 'wx');
    try {
      await handle.writeFile(content);
      await handle.sync();
    } finally {
      await handle.close();
    }
    return name;
  }
  async function snapshot(records, stage) {
    const entries = [];
    for (const record of records.values()) {
      const { content, ...metadata } = record;
      if (content) metadata.blob = await write(stage + '-' + ++sequence + '.bin', content);
      entries.push(metadata);
    }
    await write(stage + '.json', { schema: 1, operationId: id, project: project.filename, engine, entries });
  }
  const transaction = {
    id,
    location,
    snapshot,
    async document(item, stage) {
      await write('document-' + ++sequence + '.json', { stage, ...item });
    },
    async filesystem(item) {
      await write('filesystem.json', item);
    },
    async finish(result) {
      await write('result.json', {
        schema: 1,
        operationId: id,
        project: project.filename,
        ...result,
        recoveryBytes: bytes
      });
    },
    get bytes() {
      return bytes;
    }
  };
  try {
    await write('intent.json', {
      schema: 1,
      operationId: id,
      project: project.filename,
      engine,
      created: new Date().toISOString(),
      policy: 'observe-and-recover; never overwrite protected paths',
      limits
    });
    await snapshot(baseline, 'baseline');
  } catch (error) {
    error.message += ' Recovery data (possibly incomplete): ' + location;
    throw error;
  }
  return transaction;
}
module.exports = {
  defaults,
  capture,
  differences,
  metadataChanges,
  protectedPath,
  observe,
  watchFilesystem,
  unresolved,
  begin
};
