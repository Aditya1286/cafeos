// The Menu metrics: what each item earned (on the item rows), category / veg mix, add-on attach
// rate and slow movers, plus how the item filters (category, veg) behave everywhere.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { businessIdFor } from './helpers';
import { seedOrders, clearSeededOrders, startAnalyticsHarness, AnalyticsHarness } from './analyticsFixtures';
import { Category } from '../src/models/Category';
import { InventoryItem } from '../src/models/InventoryItem';
import { Product } from '../src/models/Product';
import { Recipe } from '../src/models/Recipe';

let A: AnalyticsHarness;
const id: Record<string, string> = {}; // product and category ids by short name

const makeProduct = async (key: string, categoryKey: string, pricePaise: number, extra: Record<string, unknown> = {}) => {
  const businessId = new mongoose.Types.ObjectId(await businessIdFor('artisan-cafe'));
  const product = await Product.create({ businessId, categoryId: id[categoryKey], name: key, pricePaise, imageUrl: '', ...extra });
  id[key] = String(product._id);
};

before(async () => {
  A = await startAnalyticsHarness();
  const businessId = new mongoose.Types.ObjectId(await businessIdFor('artisan-cafe'));
  for (const name of ['Hot Drinks', 'Desserts', 'Savoury', 'Empty Category']) {
    id[name] = String((await Category.create({ businessId, name }))._id);
  }
  await makeProduct('Latte', 'Hot Drinks', 5_000);
  await makeProduct('Espresso', 'Hot Drinks', 3_000);
  await makeProduct('Cake', 'Desserts', 8_000);
  await makeProduct('Chicken Roll', 'Savoury', 4_000, { isVeg: false });
  await makeProduct('Brownie', 'Desserts', 6_000); // on the menu, never sold
  await makeProduct('Old Soup', 'Savoury', 3_500); // sold once, long ago
  await makeProduct('Seasonal Pie', 'Desserts', 7_000, { isAvailable: false }); // not offered right now
  await makeProduct('Retired Dish', 'Savoury', 2_000, { isDeleted: true }); // removed from the menu
  // Latte has a recipe: 0.2 L of milk at ₹60 a litre = ₹12 a cup. The others have none.
  const milk = await InventoryItem.create({ businessId, name: 'Milk', unit: 'LITER', currentStock: 100, costPerUnitPaise: 6_000 });
  await Recipe.create({ businessId, productId: id.Latte, ingredients: [{ inventoryItemId: milk._id, quantityRequired: 0.2 }] });
});
after(async () => {
  await A.stop();
});
beforeEach(async () => {
  await clearSeededOrders();
});

/** The demo seed has menu items of its own; slow-mover checks look only at the products made here. */
const OURS = new Set(['Latte', 'Espresso', 'Cake', 'Chicken Roll', 'Brownie', 'Old Soup', 'Seasonal Pie', 'Retired Dish']);
const ours = (rows: any[]) => rows.filter((r) => OURS.has(r.label));

const line = (product: string, pricePaise: number, quantity = 1, addons: { name: string; pricePaise: number }[] = []) => ({ productId: id[product], name: product, pricePaise, quantity, addons });

/** The standard day: see the expectations below. */
const seedStandardDay = () =>
  seedOrders([
    { at: '2025-03-10T04:00:00Z', items: [line('Latte', 5_000, 2), line('Cake', 8_000)] }, // 10000 + 8000
    { at: '2025-03-10T05:00:00Z', items: [line('Latte', 5_000, 1, [{ name: 'Extra shot', pricePaise: 500 }]), line('Espresso', 3_000)] }, // 5500 + 3000
    { at: '2025-03-10T06:00:00Z', items: [line('Chicken Roll', 4_000, 3)] }, // 12000
    { at: '2025-03-10T07:00:00Z', items: [line('Cake', 8_000, 5)], paymentStatus: 'UNPAID' }, // not revenue
    { at: '2025-03-10T07:30:00Z', items: [line('Cake', 8_000, 5)], orderStatus: 'CANCELLED' }, // not revenue
    { at: '2025-03-09T06:00:00Z', items: [line('Latte', 5_000)] }, // the day before: Latte sold 5000
    { at: '2025-03-01T06:00:00Z', items: [line('Old Soup', 3_500)] }, // long ago
  ]);

// ── ranked.items ─────────────────────────────────────────────────────────────────────────────────
test('the item list carries what each item earned: units, sales, share, estimated margin', async () => {
  await seedStandardDay();
  const data = await A.metric('ranked.items');
  assert.equal(data.kind, 'ranked');
  assert.deepEqual(data.columns.map((c: any) => [c.id, c.unit]), [['units', 'count'], ['revenue', 'paise'], ['share', 'percent'], ['margin', 'paise'], ['trend', 'percent']]);
  // total item sales = 15500 + 12000 + 8000 + 3000 = 38500; biggest first
  assert.deepEqual(data.rows.map((r: any) => r.label), ['Latte', 'Chicken Roll', 'Cake', 'Espresso']);
  const latte = data.rows[0];
  assert.deepEqual([latte.values.units, latte.values.revenue, latte.values.share], [3, 15_500, 40.3]);
  assert.equal(latte.sublabel, 'Hot Drinks');
  assert.equal(latte.values.margin, 15_500 - 3 * 1_200, 'revenue minus units × recipe cost');
  assert.equal(data.rows[1].values.margin, null, 'no recipe, no margin figure (not 100%)');
  assert.deepEqual(data.rows.map((r: any) => r.values.share), [40.3, 31.2, 20.8, 7.8]);
  assert.match(data.note, /1 of 4 items/);
  assert.equal(data.truncated, false);
});

test('a trend against the previous period, and "new" items have none', async () => {
  await seedStandardDay();
  const data = await A.metric('ranked.items', { compare: 'previous_period' });
  const latte = data.rows.find((r: any) => r.label === 'Latte');
  assert.equal(latte.values.trend, 210); // 5000 → 15500
  assert.deepEqual(latte.previous, { units: 1, revenue: 5_000 });
  const roll = data.rows.find((r: any) => r.label === 'Chicken Roll');
  assert.equal(roll.values.trend, null);
  assert.deepEqual(roll.previous, { units: 0, revenue: 0 });
});

test('an item removed from the menu still shows in the period it sold', async () => {
  await seedOrders([{ at: '2025-03-10T04:00:00Z', items: [line('Retired Dish', 2_000, 2)] }]);
  const data = await A.metric('ranked.items');
  assert.deepEqual(data.rows.map((r: any) => [r.label, r.values.units]), [['Retired Dish', 2]]);
});

test('an item whose product record is gone falls back to the name on the order', async () => {
  await seedOrders([{ at: '2025-03-10T04:00:00Z', items: [{ productId: String(new mongoose.Types.ObjectId()), name: 'Mystery Special', pricePaise: 1_000 }] }]);
  const data = await A.metric('ranked.items');
  assert.equal(data.rows[0].label, 'Mystery Special');
  assert.equal(data.rows[0].sublabel, undefined);
});

test('an empty period gives an empty list, not an error', async () => {
  const data = await A.metric('ranked.items', { range: { from: '2020-01-01', to: '2020-01-01' } });
  assert.deepEqual(data.rows, []);
  assert.equal(data.note, undefined);
});

// ── item filters ─────────────────────────────────────────────────────────────────────────────────
test('the category filter keeps only that category’s items, and order totals count only matching lines', async () => {
  await seedStandardDay();
  const hot = { categoryIds: [id['Hot Drinks']] };
  const list = await A.metric('ranked.items', hot);
  assert.deepEqual(list.rows.map((r: any) => r.label), ['Latte', 'Espresso']);
  // Overview numbers under an item filter: sales = matching lines; orders = orders with a matching line
  assert.equal((await A.metric('kpi.net_sales', hot)).value, 15_500 + 3_000);
  assert.equal((await A.metric('kpi.orders', hot)).value, 2);
  assert.equal((await A.metric('kpi.avg_ticket', hot)).value, 9_250);
  assert.equal((await A.metric('kpi.items_per_order', hot)).value, 2); // 4 units over 2 orders
  const trend = await A.metric('ts.sales_orders', hot);
  assert.equal(trend.series[0].points.reduce((a: number, b: number | null) => a + (b ?? 0), 0), 18_500);
});

test('the veg filter splits veg from non-veg', async () => {
  await seedStandardDay();
  assert.deepEqual((await A.metric('ranked.items', { veg: 'nonveg' })).rows.map((r: any) => r.label), ['Chicken Roll']);
  assert.deepEqual((await A.metric('ranked.items', { veg: 'veg' })).rows.map((r: any) => r.label), ['Latte', 'Cake', 'Espresso']);
  assert.equal((await A.metric('kpi.net_sales', { veg: 'nonveg' })).value, 12_000);
});

test('a filter that matches nothing gives an empty result, never "everything"', async () => {
  await seedStandardDay();
  for (const filters of [{ categoryIds: [id['Empty Category']] }, { categoryIds: [String(new mongoose.Types.ObjectId())] }, { categoryIds: [id['Hot Drinks']], veg: 'nonveg' }]) {
    assert.equal((await A.metric('kpi.net_sales', filters)).value, 0, JSON.stringify(filters));
    assert.equal((await A.metric('kpi.orders', filters)).value, 0);
    assert.deepEqual((await A.metric('ranked.items', filters)).rows, []);
    assert.deepEqual((await A.metric('breakdown.category', filters)).slices, []);
  }
});

// ── mixes ────────────────────────────────────────────────────────────────────────────────────────
test('category mix and veg mix split item sales', async () => {
  await seedStandardDay();
  const cat = await A.metric('breakdown.category');
  assert.deepEqual(cat.slices.map((s: any) => [s.label, s.value, s.share]), [['Hot Drinks', 18_500, 48.1], ['Savoury', 12_000, 31.2], ['Desserts', 8_000, 20.8]]);
  const veg = await A.metric('breakdown.veg');
  assert.deepEqual(veg.slices.map((s: any) => [s.label, s.value, s.share]), [['Veg', 26_500, 68.8], ['Non-veg', 12_000, 31.2]]);
});

test('category mix respects the order slices', async () => {
  await seedOrders([
    { at: '2025-03-10T04:00:00Z', items: [line('Cake', 8_000)], source: 'QR_TABLE' },
    { at: '2025-03-10T05:00:00Z', items: [line('Latte', 5_000)], source: 'TAKEAWAY' },
  ]);
  const cat = await A.metric('breakdown.category', { source: ['TAKEAWAY'] });
  assert.deepEqual(cat.slices.map((s: any) => s.label), ['Hot Drinks']);
});

// ── add-on attach rate ───────────────────────────────────────────────────────────────────────────
test('add-on attach rate: the share of item lines that carry an add-on', async () => {
  await seedStandardDay();
  const data = await A.metric('kpi.addon_attach_rate', { compare: 'previous_period' });
  assert.equal(data.unit, 'percent');
  assert.equal(data.value, 20); // 1 of the 5 lines in range
  assert.equal(data.previous, 0);
  assert.equal(data.changePct, null);
  assert.equal((await A.metric('kpi.addon_attach_rate', { range: { from: '2020-01-01', to: '2020-01-01' } })).value, null);
});

// ── slow movers ──────────────────────────────────────────────────────────────────────────────────
test('slow movers: items on the menu with no sales in the period, never-sold first', async () => {
  await seedStandardDay();
  const data = await A.metric('ranked.slow_movers');
  const mine = ours(data.rows);
  assert.deepEqual(mine.map((r: any) => r.label), ['Brownie', 'Old Soup']);
  assert.equal(mine[0].values.days, null); // never sold
  const expectedDays = Math.floor((Date.now() - Date.parse('2025-03-01T06:00:00Z')) / 86_400_000);
  assert.ok(Math.abs(mine[1].values.days - expectedDays) <= 1);
  assert.equal(mine[0].sublabel, 'Desserts');
  assert.ok(!data.rows.some((r: any) => r.label === 'Seasonal Pie' || r.label === 'Retired Dish'), 'unavailable and removed items are not "slow"');
  assert.ok(data.rows.every((r: any, i: number, all: any[]) => i === 0 || (all[i - 1].values.days ?? Infinity) >= (r.values.days ?? Infinity)), 'longest gap first');
  assert.match(data.note, /\d+ of \d+ items on the menu did not sell/);
});

test('slow movers ignores order slices and says so; the category filter still applies', async () => {
  await seedStandardDay();
  const sliced = await A.query(A.owner, ['ranked.slow_movers'], { source: ['TAKEAWAY'] });
  assert.equal(sliced.body.results['ranked.slow_movers'].ok, true);
  assert.deepEqual(sliced.body.results['ranked.slow_movers'].data.notApplied, ['source']);
  assert.deepEqual(ours(sliced.body.results['ranked.slow_movers'].data.rows).map((r: any) => r.label), ['Brownie', 'Old Soup']);
  const desserts = await A.metric('ranked.slow_movers', { categoryIds: [id.Desserts] });
  assert.deepEqual(desserts.rows.map((r: any) => r.label), ['Brownie']);
});
