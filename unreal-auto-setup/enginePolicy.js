'use strict';

/** Minimum-version policy only; this does not certify an engine/workflow combination. */
function supportedVersion(major, minor) {
  return major > 5 || (major === 5 && minor >= 8);
}

/** Numeric associations constrain major/minor; custom GUID/source associations return null. */
function numericAssociation(value) {
  return /^(\d+)\.(\d+)(?:\.\d+)?$/.exec(String(value || ''));
}

module.exports = { supportedVersion, numericAssociation };
