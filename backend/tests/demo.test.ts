// Demo cafés (src/demo): set-up, order history, live orders through the real order API, the kitchen
// bot, fees, and the safety rails (key-gated endpoint, one tick at a time, real businesses never
// touched).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import nconf from 'nconf';
import mongoose from 'mongoose';
import { startHarness, Harness } from './helpers';
import authRoutes from '../src/routes/authRoutes';
import analyticsRoutes from '../src/routes/analyticsRoutes';
import demoRoutes from '../src/demo/demo.routes';
import { DEMO_CAFES } from '../src/demo/cafes';
import { provisionCafe, ownerEmailOf, CafeContext } from '../src/demo/provision';
import { runDemoTick, TickInProgressError } from '../src/demo/tick';
import { placeLiveOrder, advanceLivePlans } from '../src/demo/live';
import { buildBasket } from '../src/demo/demand';
import { priceBasket } from '../src/demo/pricing';
import { localTime, minutesOf, startOfLocalDay, DAY_MS } from '../src/demo/clock';
import { DemoOrderPlan } from '../src/demo/models/DemoOrderPlan';
import { pruneOldDemoData } from '../src/demo/prune';
import { removeDemoCafes } from '../src/demo/teardown';
import { uploadImage } from '../src/services/storage';
import { prepareOrder } from '../src/services/orderPlacement.service';
import { ensureClosedRemittancePeriods } from '../src/services/remittance.service';
import { Business } from '../src/models/Business';
import { Product } from '../src/models/Product';
import { Table } from '../src/models/Table';
import { Order } from '../src/models/Order';
import { FinancialLedger } from '../src/models/FinancialLedger';
import { DailyOrderCounter } from '../src/models/DailyOrderCounter';
import { Remittance } from '../src/models/Remittance';
import { VerifiedPhone } from '../src/models/VerifiedPhone';

const KEY = 'test-demo-key-0123456789abcdef';
const PASSWORD = 'demo-pass-123';
const BACKFILL_DAYS = 16;

let h: Harness;

const tickOverHttp = () => request(h.app).post('/api/v1/demo/tick').set('X-Demo-Key', KEY);

const contextFor = async (slug: string): Promise<CafeContext> => {
  const result = await provisionCafe(DEMO_CAFES.find((c) => c.slug === slug)!);
  assert.ok(result.ok, JSON.stringify(result));
  return result.ctx;
};

before(async () => {
  h = await startHarness();
  h.app.use('/api/v1/auth', authRoutes);
  h.app.use('/api/v1/analytics', analyticsRoutes);
  h.app.use('/api/v1/demo', demoRoutes);
  // Tests run without a config.test.json, so nconf has no writable store for the settings below
  // until one is added (in real use they come from config.<env>.json).
  nconf.use('memory');
  nconf.set('DEMO_ACCOUNT_PASSWORD', PASSWORD);
  nconf.set('DEMO_BACKFILL_DAYS', BACKFILL_DAYS);
  nconf.set('DEMO_API_BASE_URL', `${h.url}/api/v1`);
});
after(async () => {
  await h.stop();
});

test('the demo endpoints do not exist without a key, and refuse a wrong one', async () => {
  assert.equal((await tickOverHttp()).status, 404);

  nconf.set('DEMO_TICK_KEY', 'too-short');
  assert.equal((await tickOverHttp()).status, 404, 'a weak key keeps the endpoints switched off');

  nconf.set('DEMO_TICK_KEY', KEY);
  assert.equal((await request(h.app).post('/api/v1/demo/tick')).status, 401);
  assert.equal((await request(h.app).post('/api/v1/demo/tick').set('X-Demo-Key', `${KEY}x`)).status, 401);
});

test('ticks set up the three cafés as demo businesses and fill in their history', async () => {
  let body: any;
  for (let i = 0; i < 10; i++) {
    const res = await tickOverHttp();
    assert.equal(res.status, 200, JSON.stringify(res.body));
    body = res.body.data;
    if (body.caughtUp) break;
  }
  assert.ok(body.caughtUp, 'history caught up');

  for (const cafe of DEMO_CAFES) {
    const business = await Business.findOne({ slug: cafe.slug });
    assert.ok(business, `${cafe.slug} created`);
    assert.equal(business!.isDemo, true);
    assert.equal(business!.upiVpa, '', 'no UPI ID, so no real money can be paid');
    assert.equal(business!.taxRatePercentage, cafe.profile.taxRatePercentage);
    assert.equal(business!.tablesEnabled, cafe.profile.tables > 0);

    const itemCount = cafe.menu.reduce((n, c) => n + c.items.length, 0);
    assert.equal(await Product.countDocuments({ businessId: business!._id, isAvailable: true }), itemCount);
    assert.equal(await Table.countDocuments({ businessId: business!._id }), cafe.profile.tables);

    const orders = await Order.countDocuments({ businessId: business!._id });
    // ~16 days × ordersPerDay, with a generous margin for randomness and a partial first/last day.
    assert.ok(orders > BACKFILL_DAYS * cafe.traffic.ordersPerDay * 0.6, `${cafe.slug} has ${orders} orders`);
  }
});

test('history orders are internally consistent, like orders the app itself produced', async () => {
  const planned = new Set((await DemoOrderPlan.find().select('orderId')).map((p) => p.orderId.toString()));

  for (const cafe of DEMO_CAFES) {
    const business = (await Business.findOne({ slug: cafe.slug }))!;
    const orders = (await Order.find({ businessId: business._id }).lean()).filter((o) => !planned.has(o._id.toString()));
    const ledger = await FinancialLedger.find({ businessId: business._id, orderId: { $exists: true } }).lean();
    const ledgerByOrder = new Map<string, any[]>();
    for (const row of ledger) {
      const key = row.orderId!.toString();
      ledgerByOrder.set(key, [...(ledgerByOrder.get(key) || []), row]);
    }
    const open = minutesOf(cafe.profile.openingTime);
    const close = minutesOf(cafe.profile.closingTime);
    const now = Date.now();
    const sequencesByDay = new Map<string, number[]>();

    for (const order of orders) {
      const local = localTime(order.createdAt);
      assert.ok(local.minuteOfDay >= open && local.minuteOfDay < close, `${order.orderId} placed while ${cafe.slug} was open`);
      assert.equal(order.dateKey, local.dateKey);
      assert.equal(order.orderId, `${cafe.shortCode}-${local.ddmmyy}-${String(order.sequenceNumber).padStart(4, '0')}`);
      sequencesByDay.set(order.dateKey!, [...(sequencesByDay.get(order.dateKey!) || []), order.sequenceNumber!]);

      const subtotal = order.items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
      assert.equal(order.subtotalPaise, subtotal);
      assert.equal(order.taxPaise, Math.round((subtotal * cafe.profile.taxRatePercentage) / 100));
      assert.equal(order.totalAmountPaise, subtotal + order.taxPaise);
      assert.equal(order.platformFeePaise, Math.round((subtotal * 3) / 100));
      assert.equal(order.businessEarningsPaise, order.totalAmountPaise - order.platformFeePaise);
      assert.ok(order.customerPhone.startsWith('5') && order.customerPhone.length === 10);

      const rows = ledgerByOrder.get(order._id.toString()) || [];
      const t: any = order.timeline;
      if (order.orderStatus === 'COMPLETED') {
        assert.equal(order.paymentStatus, 'PAID');
        const stamps = [t.placedAt, t.acceptedAt, t.preparingAt, t.readyAt, t.completedAt].map((d: Date) => d.getTime());
        assert.deepEqual([...stamps].sort((a, b) => a - b), stamps, `${order.orderId} timeline in order`);
        assert.ok(stamps[4] < now, 'nothing completed in the future');
        assert.equal(rows.length, 2, `${order.orderId} has its two ledger rows`);
        assert.equal(rows.find((r) => r.type === 'ORDER_PAYMENT')?.amountPaise, order.totalAmountPaise);
        assert.equal(rows.find((r) => r.type === 'PLATFORM_FEE')?.amountPaise, order.platformFeePaise);
        for (const row of rows) assert.equal(row.createdAt.getTime(), t.completedAt.getTime());
      } else {
        assert.equal(order.orderStatus, 'CANCELLED');
        assert.equal(order.paymentStatus, 'UNPAID');
        assert.equal(rows.length, 0, 'a cancelled, unpaid order has no ledger rows');
      }
    }

    for (const [dateKey, sequences] of sequencesByDay) {
      assert.equal(new Set(sequences).size, sequences.length, `${cafe.slug} ${dateKey}: order numbers unique`);
      const counter = await DailyOrderCounter.findOne({ businessId: business._id, dateKey });
      const allThatDay = await Order.find({ businessId: business._id, dateKey }).select('sequenceNumber');
      assert.equal(counter!.sequence, Math.max(...allThatDay.map((o) => o.sequenceNumber!)), `${cafe.slug} ${dateKey}: counter matches`);
    }
  }
});

test("history is priced exactly like the app's own order placement", async () => {
  for (const cafe of DEMO_CAFES) {
    const ctx = await contextFor(cafe.slug);
    const phone = `5${cafe.phoneDigit}99999999`;
    await VerifiedPhone.create({ mobile: `91${phone}`, purpose: 'ORDER', expiresAt: new Date(Date.now() + 60_000) });

    for (let i = 0; i < 5; i++) {
      const lines = buildBasket(cafe, ctx.menu);
      const mine = priceBasket(ctx.business, lines);
      const { draft } = await prepareOrder({
        businessSlug: cafe.slug,
        customerName: 'Price Check',
        customerPhone: phone,
        items: lines.map((l) => ({ productId: String(l.entry.productId), quantity: l.quantity }))
      });
      for (const field of ['subtotalPaise', 'discountPaise', 'taxPaise', 'platformFeePaise', 'totalAmountPaise', 'businessEarningsPaise'] as const) {
        assert.equal(mine[field], draft[field], `${cafe.slug} ${field}`);
      }
      assert.deepEqual(
        mine.items.map((it) => [String(it.productId), it.name, it.pricePaise, it.quantity, it.itemTotalPaise]),
        draft.items.map((it: any) => [String(it.productId), it.name, it.pricePaise, it.quantity, it.itemTotalPaise])
      );
    }
    await VerifiedPhone.deleteMany({ mobile: `91${phone}` });
  }
});

test('live orders go through the real order API and the kitchen bot sees them through', async () => {
  const ctx = await contextFor('loamline-coffee');
  const now = new Date();
  const before = await Order.countDocuments({ businessId: ctx.business._id });

  let placed = 0;
  for (let i = 0; i < 6; i++) if (await placeLiveOrder(ctx, now)) placed++;
  assert.equal(placed, 6);

  const plans = await DemoOrderPlan.find({ businessId: ctx.business._id, done: false });
  const liveIds = plans.map((p) => p.orderId);
  assert.equal(await Order.countDocuments({ businessId: ctx.business._id }), before + 6);
  const live = await Order.find({ _id: { $in: liveIds } });
  assert.ok(live.length >= 6 && live.every((o) => o.orderStatus === 'PLACED' && o.paymentStatus === 'UNPAID'));
  // The OTP records the bot creates for its made-up customers are removed again.
  assert.equal(await VerifiedPhone.countDocuments({ mobile: /^915/ }), 0);

  // Nothing is due yet...
  assert.equal(await advanceLivePlans(now, [ctx.business._id.toString()]), 0);
  // ...but two hours on, every order has been through the kitchen.
  assert.ok((await advanceLivePlans(new Date(now.getTime() + 2 * 3600_000), [ctx.business._id.toString()])) >= 6);

  for (const order of await Order.find({ _id: { $in: liveIds } })) {
    assert.ok(['COMPLETED', 'CANCELLED'].includes(order.orderStatus), `${order.orderId} is ${order.orderStatus}`);
    const rows = await FinancialLedger.countDocuments({ orderId: order._id });
    if (order.orderStatus === 'COMPLETED') {
      assert.equal(order.paymentStatus, 'PAID');
      assert.ok(order.timeline?.acceptedAt && order.timeline?.readyAt && order.timeline?.completedAt);
      assert.equal(rows, 2);
    } else {
      assert.equal(rows, 0);
    }
  }
  assert.equal(await DemoOrderPlan.countDocuments({ businessId: ctx.business._id, done: false }), 0);
  assert.equal(await Table.countDocuments({ businessId: ctx.business._id, status: 'OCCUPIED' }), 0, 'tables freed');
});

test('overdue platform fees of the demo cafés are settled', async () => {
  const demoIds = (await Business.find({ isDemo: true, slug: { $in: DEMO_CAFES.map((c) => c.slug) } })).map((b) => b._id);
  const paid = await Remittance.find({ businessId: { $in: demoIds }, status: 'PAID' });
  assert.ok(paid.length > 0, 'at least one billing period settled');
  assert.equal(await Remittance.countDocuments({ businessId: { $in: demoIds }, status: 'UNPAID', dueDate: { $lt: new Date() } }), 0);
  assert.equal(await FinancialLedger.countDocuments({ businessId: { $in: demoIds }, type: 'BUSINESS_SETTLEMENT' }), paid.length);
});

test("the café owner can log in and sees the café's revenue", async () => {
  const cafe = DEMO_CAFES[0];
  const login = await request(h.app).post('/api/v1/auth/login').send({ email: ownerEmailOf(cafe), password: PASSWORD });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  const analytics = await request(h.app).get('/api/v1/analytics/dashboard').set('Authorization', `Bearer ${login.body.data.token}`);
  assert.equal(analytics.status, 200, JSON.stringify(analytics.body));
  const metrics = analytics.body.data.metrics;
  assert.ok(metrics.totalSalesPaise > 0 && metrics.weekSalesPaise > 0 && metrics.previousWeekSalesPaise > 0, JSON.stringify(metrics));
  assert.ok(analytics.body.data.dailySales.length >= 7);
  assert.ok(analytics.body.data.topProducts.length > 0);
});

test('a second tick creates nothing twice, and status reports the cafés', async () => {
  const counts = async () => ({
    businesses: await Business.countDocuments({ slug: { $in: DEMO_CAFES.map((c) => c.slug) } }),
    products: await Product.countDocuments({ businessId: { $in: (await Business.find({ isDemo: true })).map((b) => b._id) } }),
    tables: await Table.countDocuments({ qrToken: /^demo-/ })
  });
  const beforeCounts = await counts();
  assert.equal((await tickOverHttp()).status, 200);
  assert.deepEqual(await counts(), beforeCounts);

  const status = await request(h.app).get('/api/v1/demo/status').set('X-Demo-Key', KEY);
  assert.equal(status.status, 200);
  assert.equal(status.body.data.length, 3);
  assert.ok(status.body.data.every((c: any) => c.exists && c.isDemo && c.totalOrders > 0));
});

test('pruning removes old demo data whole, and leaves newer data and fee periods intact', async () => {
  const ctx = await contextFor('chiguru-tiffin-room');
  const businessId = ctx.business._id;
  const artisanId = (await Business.findOne({ slug: 'artisan-cafe' }))!._id;
  const artisanOrders = await Order.countDocuments({ businessId: artisanId });

  // Pretend it's 28 days from now, keeping 35 days: the cut lands a week back, and moves to the
  // start of that week's fee period — still well inside the 16-day history, so the older part goes.
  const future = new Date(Date.now() + 28 * DAY_MS);
  const keepFrom = startOfLocalDay(new Date(future.getTime() - 35 * DAY_MS));
  const keptOrders = await Order.countDocuments({ businessId, createdAt: { $gte: keepFrom } });
  const periodsBefore = new Map((await Remittance.find({ businessId }).lean()).map((r) => [String(r._id), r.commissionOwedPaise]));

  const result = await pruneOldDemoData(ctx, future, { force: true, keepDays: 35 });
  assert.ok(result.orders > 0 && result.ledgerRows > 0, JSON.stringify(result));
  // Nothing newer than the keep window is lost (the cut only ever moves earlier, to a period start).
  assert.equal(await Order.countDocuments({ businessId, createdAt: { $gte: keepFrom } }), keptOrders);

  const orderIds = new Set((await Order.find({ businessId }).select('_id')).map((o) => String(o._id)));
  const ledger = await FinancialLedger.find({ businessId, orderId: { $exists: true } }).select('orderId');
  assert.ok(ledger.every((row) => orderIds.has(String(row.orderId))), 'no ledger row outlives its order');

  // Kept fee periods come back with exactly the totals they had: none was cut in half.
  await ensureClosedRemittancePeriods(businessId);
  for (const period of await Remittance.find({ businessId })) {
    if (periodsBefore.has(String(period._id))) assert.equal(period.commissionOwedPaise, periodsBefore.get(String(period._id)));
  }
  assert.equal(
    await FinancialLedger.countDocuments({ businessId, type: 'BUSINESS_SETTLEMENT' }),
    await Remittance.countDocuments({ businessId, status: 'PAID' }),
    'settlement rows only for periods still there'
  );

  assert.equal(await Order.countDocuments({ businessId: artisanId }), artisanOrders, 'other businesses untouched');
});

test('only one tick runs at a time', async () => {
  const results = await Promise.allSettled([runDemoTick({ historyOnly: true }), runDemoTick({ historyOnly: true })]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof TickInProgressError);
});

test('a business that is not a demo is never touched, even under a demo slug', async () => {
  const cafe = DEMO_CAFES[2];
  const business = (await Business.findOne({ slug: cafe.slug }))!;
  await Business.updateOne({ _id: business._id }, { $set: { isDemo: false } });
  const ordersBefore = await Order.countDocuments({ businessId: business._id });

  const summary = await runDemoTick({ now: new Date(Date.now() + 3600_000) });
  const entry = summary.cafes.find((c) => c.slug === cafe.slug)!;
  assert.equal(entry.status, 'skipped');
  assert.equal(await Order.countDocuments({ businessId: business._id }), ordersBefore);
  assert.equal(mongoose.connection.readyState, 1);
});

test('removing the demo leaves no trace of it, and touches nothing else', async () => {
  const [loamline, chiguru, crumbwell, artisan] = await Promise.all(
    ['loamline-coffee', 'chiguru-tiffin-room', 'crumbwell-bakehouse', 'artisan-cafe'].map((slug) => Business.findOne({ slug }))
  );
  // Something an owner might add from the dashboard: a menu photo.
  const onePixelPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const { url } = await uploadImage({ dataUrl: onePixelPng, folder: 'menu', ownerId: loamline!._id.toString() });
  await Product.updateOne({ businessId: loamline!._id }, { $set: { imageUrl: url } });

  const demoIds = [loamline!._id, chiguru!._id];
  const untouched = async () => ({
    artisan: await Order.countDocuments({ businessId: artisan!._id }),
    // Flagged non-demo by the previous test: a real business that happens to own a demo slug.
    crumbwell: await Order.countDocuments({ businessId: crumbwell!._id })
  });
  const before = await untouched();

  const report = await removeDemoCafes();
  assert.deepEqual([...report.removedCafes].sort(), ['chiguru-tiffin-room', 'loamline-coffee']);
  assert.deepEqual(report.skippedRealBusinesses, ['crumbwell-bakehouse']);

  const db = mongoose.connection.db!;
  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  for (const name of collections) {
    assert.equal(await db.collection(name).countDocuments({ businessId: { $in: demoIds } }), 0, `${name} still has demo data`);
  }
  assert.equal(await Business.countDocuments({ _id: { $in: demoIds } }), 0);
  assert.ok(!collections.includes('demosimstates') && !collections.includes('demoorderplans'), 'demo collections dropped');
  assert.equal(await VerifiedPhone.countDocuments({ mobile: /^915/ }), 0);
  assert.deepEqual(await untouched(), before);
});
