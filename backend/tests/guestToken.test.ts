// Device proof and guest pass tokens: stateless HS256 JWTs, each signed with its own key derived
// from the JWT secret, so one kind can never verify as another (or as a login/recovery token).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { auth } from '../src/config';
import {
  DEVICE_PROOF_TTL_SECONDS,
  GUEST_PASS_TTL_SECONDS,
  signDeviceProof,
  verifyDeviceProof,
  signGuestPass,
  verifyGuestPass
} from '../src/utils/guestToken';
import { signRecoveryToken } from '../src/utils/recoveryToken';
import { phoneKeyOf, phoneMatchPattern } from '../src/utils/phone';

const PHONE = '9876543210';
const CAFE_A = '64b000000000000000000001';
const CAFE_B = '64b000000000000000000002';

// Signed the way tests/helpers.ts tokenFor signs a staff login.
const loginJwt = () => jwt.sign({ id: 'u1', role: 'OWNER', businessId: CAFE_A }, auth.jwtSecret, { expiresIn: '7d' });

test('TTL constants', () => {
  assert.equal(DEVICE_PROOF_TTL_SECONDS, 30 * 60);
  assert.equal(GUEST_PASS_TTL_SECONDS, 180 * 24 * 60 * 60);
});

test('device proof round trip', () => {
  assert.deepEqual(verifyDeviceProof(signDeviceProof(PHONE)), { phone: PHONE });
});

test('guest pass round trip, with an expiry 180 days out', () => {
  const before = Date.now();
  const { token, expiresAt } = signGuestPass({ phone: PHONE, businessId: CAFE_A });
  assert.deepEqual(verifyGuestPass(token, CAFE_A), { phone: PHONE });
  const ttlMs = expiresAt.getTime() - before;
  assert.ok(Math.abs(ttlMs - GUEST_PASS_TTL_SECONDS * 1000) < 5000, `expiresAt is ~180 days out (got ${ttlMs}ms)`);
});

test('a guest pass verified against another businessId is rejected', () => {
  const { token } = signGuestPass({ phone: PHONE, businessId: CAFE_A });
  assert.equal(verifyGuestPass(token, CAFE_B), null);
});

test('a device proof is rejected as a guest pass and vice versa', () => {
  assert.equal(verifyGuestPass(signDeviceProof(PHONE), CAFE_A), null);
  assert.equal(verifyDeviceProof(signGuestPass({ phone: PHONE, businessId: CAFE_A }).token), null);
});

test('a recovery token and a login JWT are rejected by both verifiers', () => {
  const recovery = signRecoveryToken({ phone: PHONE, businessId: CAFE_A }).token;
  const login = loginJwt();
  for (const t of [recovery, login]) {
    assert.equal(verifyDeviceProof(t), null);
    assert.equal(verifyGuestPass(t, CAFE_A), null);
  }
});

test('a token signed with the raw secret and the right claims is still rejected (keys are derived)', () => {
  const now = Math.floor(Date.now() / 1000);
  const forgedProof = jwt.sign({ typ: 'device-proof', ten: PHONE, iat: now, exp: now + 600 }, auth.jwtSecret, { algorithm: 'HS256' });
  const forgedPass = jwt.sign({ typ: 'guest', ten: PHONE, bid: CAFE_A, iat: now, exp: now + 600 }, auth.jwtSecret, { algorithm: 'HS256' });
  assert.equal(verifyDeviceProof(forgedProof), null);
  assert.equal(verifyGuestPass(forgedPass, CAFE_A), null);
});

test('expired tokens are rejected', () => {
  assert.equal(verifyDeviceProof(signDeviceProof(PHONE, -10)), null);
  assert.equal(verifyGuestPass(signGuestPass({ phone: PHONE, businessId: CAFE_A }, -10).token, CAFE_A), null);
});

test('non-string, empty and garbage input gives null', () => {
  for (const bad of [undefined, null, 42, {}, [], true, '', 'not.a.jwt', 'x'.repeat(2000)]) {
    assert.equal(verifyDeviceProof(bad), null);
    assert.equal(verifyGuestPass(bad, CAFE_A), null);
  }
  assert.equal(verifyGuestPass(signGuestPass({ phone: PHONE, businessId: CAFE_A }).token, undefined as unknown as string), null);
});

test('phoneMatchPattern matches however the number was typed, and nothing else', () => {
  const re = phoneMatchPattern(PHONE);
  for (const typed of ['9876543210', '+91 98765 43210', '919876543210', '(98765) 43-210']) {
    assert.ok(re.test(typed), `${typed} should match`);
    assert.equal(phoneKeyOf(typed), PHONE);
  }
  for (const other of ['9876543211', '98765432100', '1234567890', '']) assert.ok(!re.test(other), `${other} should not match`);
});
