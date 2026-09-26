// GST rate limits: only the restaurant GST slabs (utils/gst.ts) can be set, by the owner or a
// super admin — except that a business already on an old rate can re-save it unchanged.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, superAdminToken, businessIdFor, Harness } from './helpers';
import businessRoutes from '../src/routes/businessRoutes';
import adminRoutes from '../src/routes/adminRoutes';
import { Business } from '../src/models/Business';

let h: Harness;
let owner: string;
let superAdmin: string;
let artisanId: string;

before(async () => {
  h = await startHarness();
  h.app.use('/api/v1/business', businessRoutes);
  h.app.use('/api/v1/admin', adminRoutes);
  owner = await tokenFor('owner@artisan.com');
  superAdmin = await superAdminToken();
  artisanId = await businessIdFor('artisan-cafe');
});
after(async () => {
  await h.stop();
});

const ownerSetsTax = (taxRatePercentage: unknown) =>
  request(h.app).put('/api/v1/business/settings').set('Authorization', `Bearer ${owner}`).send({ taxRatePercentage });

const adminSetsFinance = (body: Record<string, unknown>) =>
  request(h.app)
    .put(`/api/v1/admin/businesses/${artisanId}/finance-settings`)
    .set('Authorization', `Bearer ${superAdmin}`)
    .send(body);

test('the owner can pick any restaurant GST slab, including off', async () => {
  for (const rate of [5, 18, 0]) {
    const res = await ownerSetsTax(rate);
    assert.equal(res.status, 200, `${rate}%: ${JSON.stringify(res.body)}`);
    assert.equal((await Business.findById(artisanId))!.taxRatePercentage, rate);
  }
});

test('anything that is not a restaurant GST slab is rejected, however large', async () => {
  for (const rate of [12, 28, 40, 100, 1000, -5, 5.5, '5']) {
    const res = await ownerSetsTax(rate);
    assert.equal(res.status, 400, `${rate}: ${res.status}`);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  }
  assert.equal((await Business.findById(artisanId))!.taxRatePercentage, 0);
});

test('a super admin is held to the same slabs', async () => {
  assert.equal((await adminSetsFinance({ taxRatePercentage: 40 })).status, 400);
  const ok = await adminSetsFinance({ taxRatePercentage: 18 });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal((await Business.findById(artisanId))!.taxRatePercentage, 18);
});

test('a business on an old pre-reform rate can still save its other settings', async () => {
  await Business.updateOne({ _id: artisanId }, { $set: { taxRatePercentage: 12 } });

  const res = await adminSetsFinance({ commissionRatePercentage: 4, remittanceCycleDays: 7, taxRatePercentage: 12 });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const business = await Business.findById(artisanId);
  assert.equal(business!.commissionRatePercentage, 4);
  assert.equal(business!.taxRatePercentage, 12);

  // …but can't move to a different non-slab rate.
  assert.equal((await ownerSetsTax(28)).status, 400);
});
