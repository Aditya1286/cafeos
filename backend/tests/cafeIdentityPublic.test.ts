// The café-identity block on the public payloads (GET /public/c/:slug and GET /public/orders/:id),
// plus the new schema fields it rests on (Business.identity, Product.isHouseSpecial, Order.amendments).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { cafeIdentity } from '../src/config';
import { Business } from '../src/models/Business';
import { Product } from '../src/models/Product';
import { Order } from '../src/models/Order';
import { toPublicIdentity } from '../src/services/cafeIdentity.service';
import { startHarness, Harness, createOrderPlacer } from './helpers';

let h: Harness;
let placeOrder: Awaited<ReturnType<typeof createOrderPlacer>>;

before(async () => {
  h = await startHarness();
  placeOrder = await createOrderPlacer(h.app, 'idp');
});
after(async () => {
  await h.stop();
});

const SLUG = 'artisan-cafe';
const OFF = { enabled: false, mascotRendering: 'light', theme: null, tagline: '' };

const resetIdentity = () => Business.updateOne({ slug: SLUG }, { $unset: { identity: '' } });

test('a seeded café defaults to identity off, with the default look', async () => {
  const biz = await Business.findOne({ slug: SLUG });
  assert.equal(biz!.identity.enabled, false);

  const res = await request(h.app).get(`/api/v1/public/c/${SLUG}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.identity, OFF);
});

test('GET /c/:slug carries the identity block once the café is on', async () => {
  await Business.updateOne(
    { slug: SLUG },
    { identity: { enabled: true, themeId: 'warm-classic', variantId: 'olive', tagline: 'Kadak chai' } }
  );
  try {
    const res = await request(h.app).get(`/api/v1/public/c/${SLUG}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.identity.enabled, true);
    assert.equal(res.body.data.identity.mascotRendering, 'light');
    assert.deepEqual(res.body.data.identity.theme, { id: 'warm-classic', variantId: 'olive' });
    assert.equal(res.body.data.identity.tagline, 'Kadak chai');
  } finally {
    await resetIdentity();
  }
});

test('GET /c/:slug on without a chosen theme gives theme null (the default look)', async () => {
  await Business.updateOne({ slug: SLUG }, { identity: { enabled: true } });
  try {
    const res = await request(h.app).get(`/api/v1/public/c/${SLUG}`);
    assert.deepEqual(res.body.data.identity, { enabled: true, mascotRendering: 'light', theme: null, tagline: '' });
  } finally {
    await resetIdentity();
  }
});

test('GET /c/:slug never leaks the raw identity record (enabledAt, appliedAt, themeId)', async () => {
  await Business.updateOne(
    { slug: SLUG },
    { identity: { enabled: true, enabledAt: new Date(), appliedAt: new Date(), themeId: 'cozy-night', variantId: 'amber' } }
  );
  try {
    const res = await request(h.app).get(`/api/v1/public/c/${SLUG}`);
    const identity = res.body.data.identity;
    assert.deepEqual(Object.keys(identity).sort(), ['enabled', 'mascotRendering', 'tagline', 'theme']);
    assert.equal('enabledAt' in identity, false);
    assert.equal('appliedAt' in identity, false);
    assert.equal('themeId' in identity, false);
  } finally {
    await resetIdentity();
  }
});

test('GET /public/orders/:id carries the same identity block under business', async () => {
  const order = await placeOrder();

  const off = await request(h.app).get(`/api/v1/public/orders/${order._id}`);
  assert.equal(off.status, 200);
  assert.deepEqual(off.body.data.business.identity, OFF);

  await Business.updateOne(
    { slug: SLUG },
    { identity: { enabled: true, themeId: 'modern-minimal', variantId: 'ocean', tagline: 'Slow mornings' } }
  );
  try {
    const on = await request(h.app).get(`/api/v1/public/orders/${order._id}`);
    assert.equal(on.status, 200);
    assert.deepEqual(on.body.data.business.identity, {
      enabled: true,
      mascotRendering: 'light',
      theme: { id: 'modern-minimal', variantId: 'ocean' },
      tagline: 'Slow mornings'
    });
  } finally {
    await resetIdentity();
  }
});

test('the platform switch off darkens identity even for a café that is on', async () => {
  await Business.updateOne(
    { slug: SLUG },
    { identity: { enabled: true, themeId: 'warm-classic', variantId: 'plum', tagline: 'Hello' } }
  );
  const order = await placeOrder();
  const original = cafeIdentity.enabled;
  cafeIdentity.enabled = false;
  try {
    const menu = await request(h.app).get(`/api/v1/public/c/${SLUG}`);
    assert.deepEqual(menu.body.data.identity, OFF);

    const tracker = await request(h.app).get(`/api/v1/public/orders/${order._id}`);
    assert.deepEqual(tracker.body.data.business.identity, OFF);
  } finally {
    cafeIdentity.enabled = original;
    await resetIdentity();
  }
});

test('toPublicIdentity reports the configured mascot rendering', () => {
  const original = cafeIdentity.mascotRendering;
  cafeIdentity.mascotRendering = 'heavy';
  try {
    assert.equal(toPublicIdentity({ identity: { enabled: true } }).mascotRendering, 'heavy');
    assert.equal(toPublicIdentity({}).mascotRendering, 'heavy');
  } finally {
    cafeIdentity.mascotRendering = original;
  }
});

test('toPublicIdentity hides a half-set theme (an id without its variant)', () => {
  assert.equal(toPublicIdentity({ identity: { enabled: true, themeId: 'warm-classic' } }).theme, null);
  assert.equal(toPublicIdentity({ identity: { enabled: true, variantId: 'olive' } }).theme, null);
});

test('Product.isHouseSpecial defaults to false and can be set', async () => {
  const product = await Product.findOne({});
  assert.equal(product!.isHouseSpecial, false);
  await Product.updateOne({ _id: product!._id }, { isHouseSpecial: true });
  assert.equal((await Product.findById(product!._id))!.isHouseSpecial, true);
  await Product.updateOne({ _id: product!._id }, { isHouseSpecial: false });
});

test('Order.amendments defaults to an empty list and stores what was added', async () => {
  const placed = await placeOrder();
  const order = await Order.findById(placed._id);
  assert.deepEqual(order!.amendments, []);

  const item = order!.items[0];
  const at = new Date();
  await Order.updateOne(
    { _id: order!._id },
    {
      $push: {
        amendments: {
          at,
          source: 'pairing',
          items: [{ productId: item.productId, name: item.name, pricePaise: item.pricePaise, quantity: 1, itemTotalPaise: item.pricePaise }],
          amountPaise: item.pricePaise
        }
      }
    }
  );
  const after = await Order.findById(order!._id);
  assert.equal(after!.amendments.length, 1);
  assert.equal(after!.amendments[0].source, 'pairing');
  assert.equal(after!.amendments[0].amountPaise, item.pricePaise);
  assert.equal(after!.amendments[0].items[0].name, item.name);
  assert.equal(after!.amendments[0].at.getTime(), at.getTime());
});

test('Order.amendments only accepts the pairing and staff sources', async () => {
  const placed = await placeOrder();
  const order = await Order.findById(placed._id);
  order!.amendments.push({ at: new Date(), source: 'bogus' as any, items: [], amountPaise: 0 });
  await assert.rejects(() => order!.save(), /source/);
});
