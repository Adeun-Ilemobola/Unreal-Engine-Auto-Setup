'use strict';
const path = require('node:path');
const { inside } = require('./paths');
function isMetadata(filename) {
  return /(?:\.Build\.cs|\.Target\.cs|\.uproject|\.uplugin)$/i.test(filename);
}
/**
 * Per-descriptor metadata/session storage, separate from coordinator source revisions.
 * A generation may clear stale only for the revision it captured, never a newer edit.
 */
function createState() {
  const values = new Map();
  /** @returns {import('./contracts').ProjectSession} */
  const get = filename => {
    if (!values.has(filename)) values.set(filename, { revision: 0, stale: false });
    return values.get(filename);
  };
  return {
    get,
    peek: filename => values.get(filename),
    mark(project, filename) {
      if (!inside(project.root, filename) || !isMetadata(filename)) return false;
      if (/\.uproject$/i.test(filename) && path.resolve(filename) !== path.resolve(project.filename))
        return false;
      const item = get(project.filename);
      item.revision++;
      item.stale = true;
      return true;
    },
    generated(filename, revision, success) {
      const item = get(filename);
      if (success && item.revision === revision) item.stale = false;
    }
  };
}
module.exports = { isMetadata, createState };
