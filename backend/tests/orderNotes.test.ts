// A guest can leave a note for the kitchen with their order: it is trimmed, saved on the order the
// staff see, and kept short (a note is not a place to send a wall of text, or an object).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, businessIdFor, firstProductIdFor, Harness } from './helpers';
import { Table } from '../src/models/Table';
import { VerifiedPhone } from '../src/models/VerifiedPhone';
import { Order } from '../src/models/Order';

let h: Harness;
let artisanId: string;
let productId: string;
let seq = 0;

before(async () => {
  h = await startHarness();
  artisanId = await businessIdFor('artisan-cafe');
  productId = await firstProductIdFor('artisan-cafe');
});
after(async () => {
  await h.stop();
});

const order = async (extra: Record<string, unknown>) => {
  seq++;
  const qrToken = `tok_notes_${seq}`;
  const phone = `97${String(seq).padStart(8, '0')}`;
  await Table.create({ businessId: artisanId, tableNumber: `notes ${seq}`, capacity: 2, qrToken });
  await VerifiedPhone.create({ mobile: `91${phone}`, purpose: 'ORDER', expiresAt: new Date(Date.now() + 86_400_000) });
  return request(h.app)
    .post('/api/v1/public/orders')
    .send({ qrToken, customerName: 'Note Guest', customerPhone: phone, items: [{ productId, quantity: 1 }], paymentMethod: 'CASH', ...extra });
};

test('a note is trimmed and saved on the order', async () => {
  const res = await order({ notes: '  Less sugar, please  ' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.data.notes, 'Less sugar, please');
  assert.equal((await Order.findById(res.body.data._id))!.notes, 'Less sugar, please');
});

test('no note is fine, and stays empty', async () => {
  const res = await order({});
  assert.equal(res.status, 201);
  assert.equal(res.body.data.notes, '');
});

test('a note over 300 characters, or anything but text, is refused', async () => {
  const long = await order({ notes: 'x'.repeat(301) });
  assert.equal(long.status, 400);
  assert.equal(long.body.error.code, 'VALIDATION_ERROR');
  assert.equal((await order({ notes: 'x'.repeat(300) })).status, 201);
  assert.equal((await order({ notes: { $ne: null } })).status, 400);
});
