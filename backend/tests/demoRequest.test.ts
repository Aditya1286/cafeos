// Marketing-site demo/trial requests: the public form stores a lead, and only the Super Admin
// can read or work the lead list.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, superAdminToken, Harness } from './helpers';
import { DemoRequest } from '../src/models/DemoRequest';
import { submitDemoRequest, notifyNewDemoRequest } from '../src/services/demoRequest.service';
import { notifications } from '../src/config';
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
  // Every pipeline status is counted, zeros included, for the tabs.
  assert.deepEqual(Object.keys(res.body.meta.statusCounts).sort(), ['CONTACTED', 'LOST', 'NEW', 'TRIAL_STARTED', 'WON']);
  assert.equal(res.body.meta.statusCounts.NEW, res.body.meta.newCount);
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

// The demo quiz's answers and the visit's source go straight to the service: the public route's
// 5-per-10-minutes limit is already used up by the HTTP cases above.
test('quiz answers and the traffic source are stored; malformed answers are dropped', async () => {
  await submitDemoRequest({
    ...validBody('9000000003'),
    answers: [
      { key: 'rushPain', question: 'What slips first in a rush', value: 'orders-mixed', answer: 'Orders get missed or mixed up' },
      { key: 'rushPain', question: 'Duplicate key', value: 'wait', answer: 'Ignored' },
      { key: 'tables', question: 'Tables', value: 'NOT VALID', answer: 'Ignored' },
      { key: '$where', question: 'x', value: 'x', answer: 'x' },
      'not an object'
    ],
    source: { visitorId: 'v-12345678', utmSource: 'instagram', referrer: 'instagram.com', landingPath: '/' }
  });
  const saved = await DemoRequest.findOne({ phone: '9000000003' }).lean();
  assert.ok(saved);
  assert.deepEqual(saved.answers, [
    { key: 'rushPain', question: 'What slips first in a rush', value: 'orders-mixed', answer: 'Orders get missed or mixed up' }
  ]);
  assert.equal(saved.source?.utmSource, 'instagram');
  assert.equal(saved.source?.visitorId, 'v-12345678');
});

test('a new lead is emailed through Resend, with visitor text escaped', async () => {
  const lead = await DemoRequest.findOne({ phone: '9000000003' });
  assert.ok(lead);
  lead.brandName = '<b>Brew</b> & Co';

  const realFetch = globalThis.fetch;
  const saved = { ...notifications };
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response('{"id":"x"}', { status: 200 });
  }) as typeof fetch;
  try {
    // No key configured: nothing is sent.
    notifications.resendApiKey = '';
    assert.equal(await notifyNewDemoRequest(lead), false);
    assert.equal(calls.length, 0);

    notifications.resendApiKey = 're_test';
    notifications.demoRequestTo = ['owner@example.com'];
    assert.equal(await notifyNewDemoRequest(lead), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    assert.equal((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer re_test');
    const body = JSON.parse(String(calls[0].init.body));
    assert.deepEqual(body.to, ['owner@example.com']);
    assert.match(body.subject, /Brew/);
    assert.match(body.html, /&lt;b&gt;Brew&lt;\/b&gt; &amp; Co/);
    assert.doesNotMatch(body.html, /<b>Brew/);
    assert.match(body.html, /Orders get missed or mixed up/);
    assert.match(body.html, /wa\.me\/919000000003/);

    // Resend refusing the email is logged, never thrown.
    globalThis.fetch = (async () => new Response('bad', { status: 422 })) as typeof fetch;
    assert.equal(await notifyNewDemoRequest(lead), false);
  } finally {
    globalThis.fetch = realFetch;
    Object.assign(notifications, saved);
  }
});
