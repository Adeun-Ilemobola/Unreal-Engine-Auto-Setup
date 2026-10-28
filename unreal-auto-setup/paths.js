'use strict';
const path = require('node:path');

/**
 * Strict lexical containment using the host's path semantics; root itself is excluded.
 * This does not resolve symlinks/junctions or establish write safety. Transactions must
 * still check ancestors, dirty documents, identities and exclusive-write ownership.
 */
function inside(root, filename) {
  const relative = path.relative(path.resolve(root), path.resolve(filename));
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith('..' + path.sep) &&
    !path.isAbsolute(relative)
  );
}

module.exports = { inside };
