// The demo pulse (src/demo/pulse.ts): one order per call at the demo café, key-gated, and never on
// top of a running tick.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, Harness } from './helpers';
import { demo } from '../src/config';
import authRoutes from '../src/routes/authRoutes';
import demoRoutes from '../src/demo/demo.routes';
import { acquireLock, releaseLock } from '../src/demo/tick';
import { Business } from '../src/models/Business';
import { Order } from '../src/models/Order';
import { placeLiveOrder, PULSE_KEY_PREFIX } from '../src/demo/live';
import { sweepPulseOrders } from '../src/demo/visitorSweep';
import { provisionCafe } from '../src/demo/provision';
import { DEMO_CAFES } from '../src/demo/cafes';

const KEY = 'test-demo-key-0123456789abcdef';
let h: Harness;
const pulse = (slug?: string) => request(h.app).post(`/api/v1/demo/pulse${slug ? `?slug=${slug}` : ''}`).set('X-Demo-Key', KEY);
const ordersAt = async (slug: string) => Order.countDocuments({ businessId: (await Business.findOne({ slug }))!._id });

before(async () => {
  h = await startHarness();
  h.app.use('/api/v1/auth', authRoutes);
  h.app.use('/api/v1/demo', demoRoutes);
  demo.tickKey = KEY;
  demo.accountPassword = 'demo-pass-123';
  demo.apiBaseUrl = `${h.url}/api/v1`;
});
after(async () => {
  demo.tickKey = '';
  await h.stop();
});

test('the pulse needs the demo key', async () => {
  assert.equal((await request(h.app).post('/api/v1/demo/pulse')).status, 401);
  assert.equal((await pulse('no-such-cafe')).status, 404);
});

test('each pulse places one order at Loamline, and the kitchen keeps moving', async () => {
  const first = await pulse();
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.data.slug, 'loamline-coffee');
  assert.equal(first.body.data.placed, true);
  const afterFirst = await ordersAt('loamline-coffee');

  const second = await pulse();
  assert.equal(second.body.data.placed, true);
  assert.equal(await ordersAt('loamline-coffee'), afterFirst + 1);
  assert.equal(typeof second.body.data.kitchenSteps, 'number');
});

test('a pulse waits while a tick is running', async () => {
  assert.ok(await acquireLock(60_000));
  const res = await pulse();
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'TICK_IN_PROGRESS');
  await releaseLock();
  assert.equal((await pulse()).status, 200);
});

test('pulse orders can be cleared, and the tick\'s own orders are left alone', async () => {
  const cafe = DEMO_CAFES.find((c) => c.slug === 'loamline-coffee')!;
  const provisioned = await provisionCafe(cafe);
  assert.ok(provisioned.ok);
  const ctx = provisioned.ok ? provisioned.ctx : (undefined as never);

  assert.ok(await placeLiveOrder(ctx, new Date()), 'a tick-style order');
  const fromTick = await Order.countDocuments({ businessId: ctx.business._id, idempotencyKey: { $not: new RegExp(`^${PULSE_KEY_PREFIX}`) }, createdAt: { $gte: new Date(Date.now() - 60_000) } });
  assert.equal((await pulse()).status, 200);
  const pulseOrders = () => Order.countDocuments({ businessId: ctx.business._id, idempotencyKey: { $regex: `^${PULSE_KEY_PREFIX}` } });
  assert.ok((await pulseOrders()) >= 1, 'the pulse tags its orders');

  // Fresh pulse orders stay while a demo is on; old ones go on their own.
  assert.equal(await sweepPulseOrders(ctx.business._id, new Date()), 0);
  await Order.collection.updateMany({ businessId: ctx.business._id, idempotencyKey: { $regex: `^${PULSE_KEY_PREFIX}` } }, { $set: { createdAt: new Date(Date.now() - 4 * 3600_000) } });
  assert.ok((await sweepPulseOrders(ctx.business._id, new Date())) >= 1);
  assert.equal(await pulseOrders(), 0);

  // And on demand, all at once.
  await pulse(); await pulse();
  const cleared = await request(h.app).post('/api/v1/demo/pulse/clear').set('X-Demo-Key', KEY);
  assert.equal(cleared.status, 200);
  assert.ok(cleared.body.data.deleted >= 2);
  assert.equal(await pulseOrders(), 0);
  const stillThere = await Order.countDocuments({ businessId: ctx.business._id, idempotencyKey: { $not: new RegExp(`^${PULSE_KEY_PREFIX}`) } });
  assert.ok(stillThere >= fromTick, 'tick orders survive');
});
