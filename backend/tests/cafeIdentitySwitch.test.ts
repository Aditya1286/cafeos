// The café-identity gate: identity is on for a business only when the platform switch
// (config cafeIdentity.enabled) AND the café's own opt-in (business.identity.enabled) are both true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cafeIdentity } from '../src/config';
import { isIdentityOnFor } from '../src/services/cafeIdentity.service';

test('the test config has the platform switch on with light mascot rendering', () => {
  assert.equal(cafeIdentity.enabled, true);
  assert.equal(cafeIdentity.mascotRendering, 'light');
});

test('isIdentityOnFor is true only when the café has opted in', () => {
  assert.equal(isIdentityOnFor({ identity: { enabled: true } }), true);
});

test('isIdentityOnFor is false for a missing business', () => {
  assert.equal(isIdentityOnFor(null), false);
  assert.equal(isIdentityOnFor(undefined), false);
});

test('isIdentityOnFor is false for a business with no identity or no opt-in', () => {
  assert.equal(isIdentityOnFor({}), false);
  assert.equal(isIdentityOnFor({ identity: {} }), false);
  assert.equal(isIdentityOnFor({ identity: { enabled: false } }), false);
});

test('isIdentityOnFor is false for every café when the platform switch is off', () => {
  const original = cafeIdentity.enabled;
  cafeIdentity.enabled = false;
  try {
    assert.equal(isIdentityOnFor({ identity: { enabled: true } }), false);
  } finally {
    cafeIdentity.enabled = original;
  }
  assert.equal(isIdentityOnFor({ identity: { enabled: true } }), true);
});
