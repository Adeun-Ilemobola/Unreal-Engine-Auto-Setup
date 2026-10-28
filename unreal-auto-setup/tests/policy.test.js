'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const classes = require('../classFiles');
const tracking = require('../dirtyTracker');
const policy = require('../enginePolicy');

test('numeric association policy preserves patch, GUID, whitespace and missing-value behavior', () => {
  for (const value of [
    '5.8',
    '5.8.1',
    '6.0',
    '5.7',
    '{custom-guid}',
    '',
    undefined,
    null,
    0,
    ' 5.8',
    '5.8.1.2'
  ]) {
    const previous = /^(\d+)\.(\d+)(?:\.\d+)?$/.exec(String(value || ''));
    assert.deepEqual(policy.numericAssociation(value), previous);
  }
  assert.equal(require('../core').supportedVersion, policy.supportedVersion);
  assert.equal(policy.supportedVersion(5, 7), false);
  assert.equal(policy.supportedVersion(5, 8), true);
  assert.equal(policy.supportedVersion(6, 0), true);
});

test('Doctor header uses a readable Unicode separator', () => {
  assert.equal(require('../diagnostics').format([]), 'Unreal Engine Auto Setup — Project diagnostics');
});

test('containment rejects the immediate parent consistently across creation and tracking', () => {
  const root = path.resolve('Game/Source');
  for (const inside of [classes.inside, tracking.inside]) {
    assert.equal(inside(root, path.dirname(root)), false);
  }
});

test('containment boundaries preserve child, relative, case and cross-drive semantics', () => {
  const root = path.resolve('Game');
  for (const inside of [classes.inside, tracking.inside]) {
    assert.equal(inside(root, root), false);
    assert.equal(inside(root, path.join(root, 'Source', 'Actor.cpp')), true);
    assert.equal(inside(root, path.resolve('Game2/Actor.cpp')), false);
    assert.equal(inside('Game', 'Game/Source/Actor.cpp'), true);
    assert.equal(inside(root, path.join(root, '..', 'Other', 'Actor.cpp')), false);
    if (process.platform === 'win32') {
      assert.equal(inside('C:\\Game', 'c:\\game\\Source\\Actor.cpp'), true);
      assert.equal(inside('C:\\Game', 'D:\\Game\\Source\\Actor.cpp'), false);
    }
  }
});
