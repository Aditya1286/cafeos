// The seller's GSTIN: an owner can set, change and clear it in Settings; it is validated and
// normalised; and it is optional everywhere else.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, Harness } from './helpers';
import { Business } from '../src/models/Business';

let h: Harness;
let owner: string;
let staff: string;

before(async () => {
  h = await startHarness();
  owner = await tokenFor('owner@artisan.com');
  staff = await tokenFor('staff@artisan.com');
});
after(async () => {
  await h.stop();
});

const save = (token: string, body: object) =>
  request(h.app).put('/api/v1/business/settings').set('Authorization', `Bearer ${token}`).send(body);

const storedGstin = async () => (await Business.findOne({ slug: 'artisan-cafe' }))!.gstin;

test('an owner can save a GSTIN, and it is stored trimmed and uppercase', async () => {
  const res = await save(owner, { gstin: '  29abcde1234f1z5 ' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.gstin, '29ABCDE1234F1Z5');
  assert.equal(await storedGstin(), '29ABCDE1234F1Z5');
});

test('a malformed GSTIN is rejected and the saved one is left alone', async () => {
  for (const bad of ['not-a-gstin', '29ABCDE1234F1Z', '29ABCDE1234F1X5', 12345]) {
    const res = await save(owner, { gstin: bad });
    assert.equal(res.status, 400, `${bad} should be rejected`);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  }
  assert.equal(await storedGstin(), '29ABCDE1234F1Z5');
});

test('saving other settings does not touch the GSTIN, and an empty value clears it', async () => {
  assert.equal((await save(owner, { masterQrEnabled: true })).status, 200);
  assert.equal(await storedGstin(), '29ABCDE1234F1Z5');

  const cleared = await save(owner, { gstin: '' });
  assert.equal(cleared.status, 200);
  assert.equal(await storedGstin(), undefined);
});

test('only the owner can change business settings, including the GSTIN', async () => {
  const res = await save(staff, { gstin: '29ABCDE1234F1Z5' });
  assert.equal(res.status, 403);
  assert.equal(await storedGstin(), undefined);
});
