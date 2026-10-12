// Marketing-site demo/trial requests: the public form stores a lead, and only the Super Admin
// can read or work the lead list.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, superAdminToken, Harness } from './helpers';
import { DemoRequest } from '../src/models/DemoRequest';
import { submitDemoRequest } from '../src/services/demoRequest.service';
import { ServiceError } from '../src/utils/serviceError';

let h: Harness;
let superAdmin: string;
let owner: string;

const validBody = (phone: string) => ({
  name: 'Asha Rao',
  brandName: 'Brew Lane',
  phone,
  city: 'Pune',
  businessType: 'Café',
  consentToContact: true
});

before(async () => {
  h = await startHarness();
  superAdmin = await superAdminToken();
  owner = await tokenFor('owner@artisan.com');
});
after(async () => {
  await h.stop();
});

test('a valid request is stored as NEW with a normalised phone', async () => {
  const res = await request(h.app).post('/api/v1/public/demo-requests').send(validBody('+91 98765 43210'));
  assert.equal(res.status, 201);
  const saved = await DemoRequest.findOne({ phone: '9876543210' });
  assert.ok(saved);
  assert.equal(saved.status, 'NEW');
  assert.equal(saved.consentToContact, true);
});

// The public route allows 5 submissions per 10 minutes per IP, so the field-by-field validation
// cases go straight at the service; only one rejection is exercised over HTTP.
test('bad phone, missing consent and missing fields are rejected', async () => {
  const rejects = (body: object, code: string) =>
    assert.rejects(
      () => submitDemoRequest(body),
      (err: any) => err instanceof ServiceError && err.statusCode === 400 && err.code === code
    );
  await rejects(validBody('12345'), 'VALIDATION_ERROR');
  await rejects({ ...validBody('9123456781'), name: '' }, 'VALIDATION_ERROR');
  await rejects({ ...validBody('9123456782'), email: 'not-an-email' }, 'VALIDATION_ERROR');
  await rejects({ ...validBody('9123456783'), consentToContact: false }, 'CONSENT_REQUIRED');

  const http = await request(h.app)
    .post('/api/v1/public/demo-requests')
    .send({ ...validBody('9123456780'), consentToContact: false });
  assert.equal(http.status, 400);
  assert.equal(http.body.error.code, 'CONSENT_REQUIRED');
  assert.equal(await DemoRequest.countDocuments({ phone: /^9123456/ }), 0);
});

test('the same number asking twice in a day does not create a duplicate lead', async () => {
  const body = validBody('9000000001');
  assert.equal((await request(h.app).post('/api/v1/public/demo-requests').send(body)).status, 201);
  assert.equal((await request(h.app).post('/api/v1/public/demo-requests').send(body)).status, 201);
  assert.equal(await DemoRequest.countDocuments({ phone: '9000000001' }), 1);
});

test('a filled honeypot looks like success but stores nothing', async () => {
  const res = await request(h.app)
    .post('/api/v1/public/demo-requests')
    .send({ ...validBody('9000000002'), website: 'http://spam.example' });
  assert.equal(res.status, 201);
  assert.equal(await DemoRequest.countDocuments({ phone: '9000000002' }), 0);
});

test('only the Super Admin can list leads', async () => {
  assert.equal((await request(h.app).get('/api/v1/admin/demo-requests')).status, 401);
  assert.equal((await request(h.app).get('/api/v1/admin/demo-requests').set('Authorization', `Bearer ${owner}`)).status, 403);

  const res = await request(h.app).get('/api/v1/admin/demo-requests').set('Authorization', `Bearer ${superAdmin}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.data.length >= 2);
  assert.ok(res.body.meta.newCount >= 2);
});

test('the Super Admin can move a lead through the pipeline and add a note', async () => {
  const lead = await DemoRequest.findOne({ phone: '9876543210' });
  assert.ok(lead);

  const res = await request(h.app)
    .put(`/api/v1/admin/demo-requests/${lead._id}`)
    .set('Authorization', `Bearer ${superAdmin}`)
    .send({ status: 'CONTACTED', adminNote: 'Called, demo on Friday' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'CONTACTED');
  assert.equal(res.body.data.adminNote, 'Called, demo on Friday');
  assert.ok(res.body.data.contactedAt);

  const bad = await request(h.app)
    .put(`/api/v1/admin/demo-requests/${lead._id}`)
    .set('Authorization', `Bearer ${superAdmin}`)
    .send({ status: 'BANANA' });
  assert.equal(bad.status, 400);

  const filtered = await request(h.app)
    .get('/api/v1/admin/demo-requests?status=CONTACTED')
    .set('Authorization', `Bearer ${superAdmin}`);
  assert.equal(filtered.body.data.length, 1);
});
