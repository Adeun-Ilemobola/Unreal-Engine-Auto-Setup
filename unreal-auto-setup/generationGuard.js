'use strict';
const path = require('node:path');

// Cooperative, in-host exclusion only. This is not cross-reload process ownership.
const active = new Set();
const key = value => {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};
function overlaps(a, b) {
  a = key(a);
  b = key(b);
  return a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep);
}
function acquire(paths, kind = 'mutation') {
  if (paths.some(filename => [...active].some(item => item.paths.some(other => overlaps(filename, other)))))
    throw new Error(
      'Regeneration/configuration operation already active for this project or engine. Retry after it completes.'
    );
  const entry = { paths: paths.map(key), kind };
  active.add(entry);
  return () => active.delete(entry);
}
async function mutate(paths, action) {
  const release = acquire(paths);
  try {
    return await action();
  } finally {
    release();
  }
}
module.exports = { acquire, mutate };
