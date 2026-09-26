// The master QR — the business's general menu link (/c/:slug), with no table in it. While it's on
// (the default), customers can order through it even when tables are on, as a counter order; the
// owner can turn it off so a table-using café only takes orders from table QRs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { startHarness, tokenFor, businessIdFor, firstProductIdFor, Harness } from './helpers';
import businessRoutes from '../src/routes/businessRoutes';
import { Business } from '../src/models/Business';
import { Table } from '../src/models/Table';
import { VerifiedPhone } from '../src/models/VerifiedPhone';

let h: Harness;
let owner: string;
let artisanId: string;
let productId: string;
let seq = 0;

before(async () => {
  h = await startHarness();
  h.app.use('/api/v1/business', businessRoutes);
  owner = await tokenFor('owner@artisan.com');
  artisanId = await businessIdFor('artisan-cafe');
  productId = await firstProductIdFor('artisan-cafe');
});
after(async () => {
  await h.stop();
});

const verifiedPhone = async () => {
  seq++;
  const phone = `96${String(seq).padStart(8, '0')}`;
  await VerifiedPhone.create({ mobile: `91${phone}`, purpose: 'ORDER', expiresAt: new Date(Date.now() + 86_400_000) });
  return phone;
};

/** Ordering the way the master QR does: by business slug, no table token. */
const orderViaMasterQr = async () =>
  request(h.app)
    .post('/api/v1/public/orders')
    .send({ businessSlug: 'artisan-cafe', customerName: 'Walk-in', customerPhone: await verifiedPhone(), items: [{ productId, quantity: 1 }], paymentMethod: 'CASH' });

const setOwnerSetting = (body: Record<string, unknown>) =>
  request(h.app).put('/api/v1/business/settings').set('Authorization', `Bearer ${owner}`).send(body);

test('with tables on, the master QR takes orders by default — as a counter order, no table', async () => {
  const business = await Business.findById(artisanId);
  assert.equal(business!.tablesEnabled, true);

  const menu = await request(h.app).get('/api/v1/public/c/artisan-cafe');
  assert.equal(menu.body.data.masterQrEnabled, true);

  const res = await orderViaMasterQr();
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.data.tableName, 'Counter');
  assert.equal(res.body.data.source, 'TAKEAWAY');
  assert.equal(res.body.data.tableId, undefined);
});

test('a business saved before the setting existed behaves as if it were on', async () => {
  await Business.collection.updateOne({ _id: new mongoose.Types.ObjectId(artisanId) }, { $unset: { masterQrEnabled: '' } });
  assert.equal((await orderViaMasterQr()).status, 201);
});

test('the owner can turn it off: then only table QRs take orders', async () => {
  const off = await setOwnerSetting({ masterQrEnabled: false });
  assert.equal(off.status, 200, JSON.stringify(off.body));
  assert.equal(off.body.data.masterQrEnabled, false);

  const refused = await orderViaMasterQr();
  assert.equal(refused.status, 400);
  assert.equal(refused.body.error.code, 'TABLE_REQUIRED');

  // Table QRs are unaffected.
  seq++;
  const qrToken = `tok_master_${seq}`;
  await Table.create({ businessId: artisanId, tableNumber: `Master ${seq}`, capacity: 2, qrToken });
  const atTable = await request(h.app)
    .post('/api/v1/public/orders')
    .send({ qrToken, customerName: 'Seated', customerPhone: await verifiedPhone(), items: [{ productId, quantity: 1 }], paymentMethod: 'CASH' });
  assert.equal(atTable.status, 201, JSON.stringify(atTable.body));
});

test('with tables off, the general link always takes orders, whatever the master QR switch says', async () => {
  await setOwnerSetting({ tablesEnabled: false });
  assert.equal((await orderViaMasterQr()).status, 201);
  await setOwnerSetting({ tablesEnabled: true, masterQrEnabled: true });
});

test('only a real boolean is accepted', async () => {
  const res = await setOwnerSetting({ masterQrEnabled: 'no' });
  assert.equal(res.status, 400);
});
