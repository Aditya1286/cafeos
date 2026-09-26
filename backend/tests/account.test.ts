// Own-account management: profile + picture (through the storage helper), password change, and
// the two actions gated by a fresh OTP to the business phone — the owner's email change and
// "forgot password". Runs in mock OTP mode, where the code is echoed back by /public/otp/request.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, Harness } from './helpers';
import authRoutes from '../src/routes/authRoutes';
import accountRoutes from '../src/routes/accountRoutes';
import staffRoutes from '../src/routes/staffRoutes';
import { VerifiedPhone } from '../src/models/VerifiedPhone';

let h: Harness;
let owner: string;
let staffToken: string;

const OWNER_EMAIL = 'owner@artisan.com';
const BUSINESS_PHONE = '9876501234'; // artisan-cafe's business phone in the seed
const SEED_PASSWORD = 'password123';

// 1×1 transparent PNG.
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

before(async () => {
  h = await startHarness();
  h.app.use('/api/v1/auth', authRoutes);
  h.app.use('/api/v1/account', accountRoutes);
  h.app.use('/api/v1/staff', staffRoutes);
  owner = await tokenFor(OWNER_EMAIL);

  await request(h.app)
    .post('/api/v1/staff')
    .set('Authorization', `Bearer ${owner}`)
    .send({ name: 'Line Cook', email: 'linecook@artisan.com', password: 'kitchen-pass-1' });
  staffToken = (await request(h.app).post('/api/v1/auth/login').send({ email: 'linecook@artisan.com', password: 'kitchen-pass-1' }))
    .body.data.token;
});
after(async () => {
  await h.stop();
});

const as = (token: string) => ({ Authorization: `Bearer ${token}` });
const login = (email: string, password: string) => request(h.app).post('/api/v1/auth/login').send({ email, password });

/** The mock-mode OTP round trip for an account action on the business phone. */
const passAccountOtp = async (phone = BUSINESS_PHONE) => {
  const sent = await request(h.app).post('/api/v1/public/otp/request').send({ phone, purpose: 'ACCOUNT' });
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  assert.equal(sent.body.code, 'OTP_SENT', 'an account OTP must always be sent fresh');
  const verified = await request(h.app).post('/api/v1/public/otp/verify').send({ phone, otp: sent.body.debugOtp, purpose: 'ACCOUNT' });
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
};

// ── Profile ─────────────────────────────────────────────────────────────────

test('the owner sees the full business phone; staff only a masked one', async () => {
  const ownerProfile = (await request(h.app).get('/api/v1/account/profile').set(as(owner))).body.data;
  assert.match(ownerProfile.business.phone, /9876501234/);

  const staffProfile = (await request(h.app).get('/api/v1/account/profile').set(as(staffToken))).body.data;
  assert.equal(staffProfile.role, 'STAFF');
  assert.equal(staffProfile.business.phone, undefined);
  assert.equal(staffProfile.business.phoneMasked, '98••••••34');
});

test('anyone can rename themselves', async () => {
  const res = await request(h.app).put('/api/v1/account/profile').set(as(staffToken)).send({ name: 'Head Cook' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.name, 'Head Cook');
  assert.equal((await request(h.app).put('/api/v1/account/profile').set(as(staffToken)).send({ name: '  ' })).status, 400);
});

test('a profile picture is stored, served, and replaced (the old file is removed)', async () => {
  const first = await request(h.app).put('/api/v1/account/avatar').set(as(staffToken)).send({ image: PNG_DATA_URL });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const firstUrl: string = first.body.data.avatarUrl;
  assert.match(firstUrl, /^\/api\/v1\/public\/images\/[0-9a-f]{24}$/);

  const served = await request(h.app).get(firstUrl);
  assert.equal(served.status, 200);
  assert.equal(served.headers['content-type'], 'image/png');

  const second = await request(h.app).put('/api/v1/account/avatar').set(as(staffToken)).send({ image: PNG_DATA_URL });
  assert.notEqual(second.body.data.avatarUrl, firstUrl);
  assert.equal((await request(h.app).get(firstUrl)).status, 404);

  const removed = await request(h.app).delete('/api/v1/account/avatar').set(as(staffToken));
  assert.equal(removed.body.data.avatarUrl, '');
});

test('only raster images are accepted', async () => {
  const svg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
  const res = await request(h.app).put('/api/v1/account/avatar').set(as(staffToken)).send({ image: svg });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_IMAGE');
});

// ── Password change ─────────────────────────────────────────────────────────

test('changing your password needs the current one, and logs out every other session', async () => {
  const other = (await login('linecook@artisan.com', 'kitchen-pass-1')).body.data.token;

  const wrong = await request(h.app).put('/api/v1/account/password').set(as(staffToken)).send({ currentPassword: 'nope', newPassword: 'another-pass-2' });
  assert.equal(wrong.status, 400);

  const ok = await request(h.app).put('/api/v1/account/password').set(as(staffToken)).send({ currentPassword: 'kitchen-pass-1', newPassword: 'another-pass-2' });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const fresh = ok.body.data.token;

  assert.equal((await request(h.app).get('/api/v1/auth/me').set(as(other))).status, 401);
  assert.equal((await request(h.app).get('/api/v1/auth/me').set(as(fresh))).status, 200);
  staffToken = fresh;
});

// ── Email change (owner, OTP to the business phone) ─────────────────────────

test('staff cannot change their own email', async () => {
  const res = await request(h.app).put('/api/v1/account/email').set(as(staffToken)).send({ newEmail: 'me@elsewhere.com' });
  assert.equal(res.status, 403);
});

test("the owner's email change needs a fresh OTP to the business phone, used once", async () => {
  const noOtp = await request(h.app).put('/api/v1/account/email').set(as(owner)).send({ newEmail: 'chef@artisan.com' });
  assert.equal(noOtp.status, 400);
  assert.equal(noOtp.body.error.code, 'PHONE_NOT_VERIFIED');

  // A long-lived order verification of the same phone doesn't count.
  await VerifiedPhone.create({ mobile: `91${BUSINESS_PHONE}`, purpose: 'ORDER', expiresAt: new Date(Date.now() + 86_400_000) });
  assert.equal((await request(h.app).put('/api/v1/account/email').set(as(owner)).send({ newEmail: 'chef@artisan.com' })).status, 400);

  await passAccountOtp();
  const changed = await request(h.app).put('/api/v1/account/email').set(as(owner)).send({ newEmail: 'chef@artisan.com' });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  assert.equal(changed.body.data.email, 'chef@artisan.com');
  assert.equal((await login('chef@artisan.com', SEED_PASSWORD)).status, 200);

  const again = await request(h.app).put('/api/v1/account/email').set(as(owner)).send({ newEmail: OWNER_EMAIL });
  assert.equal(again.status, 400, 'the OTP verification should have been consumed');

  await passAccountOtp();
  assert.equal((await request(h.app).put('/api/v1/account/email').set(as(owner)).send({ newEmail: OWNER_EMAIL })).status, 200);
});

// ── Forgot password (owner, OTP to the business phone) ──────────────────────

test('reset details must be an owner email plus that business phone — with one answer for every miss', async () => {
  const check = (email: string, phone: string) => request(h.app).post('/api/v1/auth/password-reset/verify-details').send({ email, phone });

  const misses = [
    await check(OWNER_EMAIL, '9000000000'), // wrong phone
    await check('nobody@nowhere.com', BUSINESS_PHONE), // unknown email
    await check('linecook@artisan.com', BUSINESS_PHONE) // staff can't self-reset
  ];
  for (const res of misses) {
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'RESET_DETAILS_MISMATCH');
  }
  assert.equal(misses[0].body.error.message, misses[1].body.error.message);

  const hit = await check(OWNER_EMAIL, `+91 ${BUSINESS_PHONE}`);
  assert.equal(hit.status, 200, JSON.stringify(hit.body));
});

test('forgot password resets only after the OTP, and logs out existing sessions', async () => {
  const reset = (newPassword: string) =>
    request(h.app).post('/api/v1/auth/password-reset').send({ email: OWNER_EMAIL, phone: BUSINESS_PHONE, newPassword });

  const early = await reset('recovered-pass-9');
  assert.equal(early.status, 400);
  assert.equal(early.body.error.code, 'PHONE_NOT_VERIFIED');

  const session = (await login(OWNER_EMAIL, SEED_PASSWORD)).body.data.token;
  await passAccountOtp();
  const done = await reset('recovered-pass-9');
  assert.equal(done.status, 200, JSON.stringify(done.body));

  assert.equal((await request(h.app).get('/api/v1/auth/me').set(as(session))).status, 401);
  assert.equal((await login(OWNER_EMAIL, SEED_PASSWORD)).status, 401);
  assert.equal((await login(OWNER_EMAIL, 'recovered-pass-9')).status, 200);
  assert.equal((await reset('yet-another-pass')).status, 400, 'the OTP verification should have been consumed');
});
