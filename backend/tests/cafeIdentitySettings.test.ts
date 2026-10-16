// Café identity settings: the theme allow-list, the owner's Café look save, the super admin's
// per-café switch, and the "house special" flag (at most HOUSE_SPECIAL_MAX per café).
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { cafeIdentity } from '../src/config';
import { Business } from '../src/models/Business';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { User } from '../src/models/User';
import { CAFE_THEMES, isValidTheme } from '../src/constants/cafeThemes';
import { HOUSE_SPECIAL_MAX } from '../src/services/cafeIdentity.service';
import { startHarness, Harness, tokenFor, superAdminToken, businessIdFor } from './helpers';

let h: Harness;
let owner: string;
let manager: string;
let receptionist: string;
let otherOwner: string;
let admin: string;
let artisanId: string;
let otherCafeId: string;

const SLUG = 'artisan-cafe';

before(async () => {
  h = await startHarness();
  artisanId = await businessIdFor(SLUG);
  otherCafeId = await businessIdFor('bean-and-butter');
  // The seed has no MANAGER; make one at the artisan café.
  await User.create({
    name: 'Mira Manager',
    email: 'manager@artisan.com',
    passwordHash: 'unused-in-token-tests',
    role: 'MANAGER',
    businessId: artisanId,
    status: 'ACTIVE'
  });
  owner = await tokenFor('owner@artisan.com');
  manager = await tokenFor('manager@artisan.com');
  receptionist = await tokenFor('staff@artisan.com');
  otherOwner = await tokenFor('owner@beanandbutter.com');
  admin = await superAdminToken();
});
after(async () => {
  await h.stop();
});

const turnOn = (extra: Record<string, unknown> = {}) =>
  Business.updateOne({ slug: SLUG }, { $set: { identity: { enabled: true, ...extra } } });
const reset = () => Business.updateOne({ slug: SLUG }, { $unset: { identity: '' } });
const putIdentity = (token: string | null, body: object) => {
  const req = request(h.app).put('/api/v1/business/identity');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.send(body);
};
const putAdmin = (id: string, body: object, token: string = admin) =>
  request(h.app).put(`/api/v1/admin/businesses/${id}/identity`).set('Authorization', `Bearer ${token}`).send(body);

// ── allow-list ──────────────────────────────────────────────────────────────

test('the allow-list holds exactly the three launch themes and their variants', () => {
  assert.deepEqual(
    CAFE_THEMES.map((t) => [t.id, t.variants.map((v) => v.id)]),
    [
      ['warm-classic', ['terracotta', 'olive', 'plum']],
      ['modern-minimal', ['sage', 'ocean', 'charcoal']],
      ['cozy-night', ['amber', 'ember', 'mint']]
    ]
  );
});

test('isValidTheme accepts a real pair and rejects everything else', () => {
  assert.equal(isValidTheme('cozy-night', 'ember'), true);
  assert.equal(isValidTheme('cozy-night', 'olive'), false); // variant of another theme
  assert.equal(isValidTheme('street-bold', 'ember'), false);
  assert.equal(isValidTheme('caos', 'default'), false); // the built-in look is never stored
  assert.equal(isValidTheme('', ''), false);
});

// ── owner: PUT /business/identity ───────────────────────────────────────────

beforeEach(async () => {
  await reset();
});

test('an owner sets a theme while the café is on: 200 with the theme echoed, appliedAt stamped', async () => {
  await turnOn();
  const res = await putIdentity(owner, { themeId: 'cozy-night', variantId: 'ember' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, {
    enabled: true,
    mascotRendering: 'light',
    theme: { id: 'cozy-night', variantId: 'ember' },
    tagline: ''
  });
  const biz = await Business.findOne({ slug: SLUG });
  assert.equal(biz!.identity.themeId, 'cozy-night');
  assert.equal(biz!.identity.variantId, 'ember');
  assert.ok(biz!.identity.appliedAt instanceof Date);

  // ...and the guests see it on the public payload.
  const pub = await request(h.app).get(`/api/v1/public/c/${SLUG}`);
  assert.deepEqual(pub.body.data.identity.theme, { id: 'cozy-night', variantId: 'ember' });
});

test('an owner can save a tagline along with, or without, a theme', async () => {
  await turnOn({ themeId: 'warm-classic', variantId: 'plum' });
  const res = await putIdentity(owner, { tagline: '  Kadak chai since 1998  ' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.tagline, 'Kadak chai since 1998');
  assert.deepEqual(res.body.data.theme, { id: 'warm-classic', variantId: 'plum' }); // untouched
});

test('changing the theme keeps the first appliedAt; clearing it forgets it', async () => {
  await turnOn();
  await putIdentity(owner, { themeId: 'warm-classic', variantId: 'olive' });
  const first = (await Business.findOne({ slug: SLUG }))!.identity.appliedAt!;
  assert.ok(first);

  await new Promise((r) => setTimeout(r, 15));
  await putIdentity(owner, { themeId: 'modern-minimal', variantId: 'sage' });
  const second = (await Business.findOne({ slug: SLUG }))!.identity.appliedAt!;
  assert.equal(second.getTime(), first.getTime());

  const cleared = await putIdentity(owner, { themeId: null });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.data.theme, null);
  const biz = await Business.findOne({ slug: SLUG });
  assert.equal(biz!.identity.themeId, undefined);
  assert.equal(biz!.identity.variantId, undefined);
  assert.equal(biz!.identity.appliedAt, undefined);
  assert.equal(biz!.identity.enabled, true); // clearing the look never switches the café off
});

test('the same request when the café is off is refused with IDENTITY_OFF', async () => {
  const res = await putIdentity(owner, { themeId: 'cozy-night', variantId: 'ember' });
  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'IDENTITY_OFF');
  const biz = await Business.findOne({ slug: SLUG });
  assert.equal(biz!.identity.themeId, undefined);
});

test('the platform switch off also refuses with IDENTITY_OFF, even for a café that is on', async () => {
  await turnOn();
  const original = cafeIdentity.enabled;
  cafeIdentity.enabled = false;
  try {
    const res = await putIdentity(owner, { themeId: 'cozy-night', variantId: 'ember' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'IDENTITY_OFF');
  } finally {
    cafeIdentity.enabled = original;
  }
});

test('an unknown theme, an unknown or mismatched variant, or a missing variant is INVALID_THEME', async () => {
  await turnOn();
  const bodies = [
    { themeId: 'street-bold' },
    { themeId: 'street-bold', variantId: 'ember' },
    { themeId: 'cozy-night', variantId: 'olive' },
    { themeId: 'cozy-night' },
    { themeId: 'caos', variantId: 'default' },
    { themeId: 42, variantId: 'ember' },
    { themeId: 'cozy-night', variantId: { x: 1 } }
  ];
  for (const body of bodies) {
    const res = await putIdentity(owner, body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.error.code, 'INVALID_THEME', JSON.stringify(body));
  }
  const biz = await Business.findOne({ slug: SLUG });
  assert.equal(biz!.identity.themeId, undefined); // nothing was saved
});

test('a tagline over 80 characters is a VALIDATION_ERROR; exactly 80 is fine', async () => {
  await turnOn();
  const tooLong = await putIdentity(owner, { tagline: 'x'.repeat(81) });
  assert.equal(tooLong.status, 400);
  assert.equal(tooLong.body.error.code, 'VALIDATION_ERROR');

  const notText = await putIdentity(owner, { tagline: 123 });
  assert.equal(notText.status, 400);
  assert.equal(notText.body.error.code, 'VALIDATION_ERROR');

  const ok = await putIdentity(owner, { tagline: 'y'.repeat(80) });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.tagline.length, 80);
});

test('an invalid tagline saves nothing, even alongside a valid theme', async () => {
  await turnOn();
  const res = await putIdentity(owner, { themeId: 'cozy-night', variantId: 'ember', tagline: 'x'.repeat(81) });
  assert.equal(res.status, 400);
  const biz = await Business.findOne({ slug: SLUG });
  assert.equal(biz!.identity.themeId, undefined);
});

test('the owner endpoint cannot be used to switch identity on, or to touch other fields', async () => {
  const res = await putIdentity(owner, { enabled: true, themeId: 'cozy-night', variantId: 'ember' });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'IDENTITY_OFF');
  assert.equal((await Business.findOne({ slug: SLUG }))!.identity.enabled, false);

  await turnOn();
  await putIdentity(owner, { enabled: false, enabledAt: new Date(0), name: 'Hacked' });
  const biz = await Business.findOne({ slug: SLUG });
  assert.equal(biz!.identity.enabled, true);
  assert.equal(biz!.identity.enabledAt, undefined);
  assert.notEqual(biz!.name, 'Hacked');
});

test('only the OWNER may save: a manager, a receptionist and an anonymous caller are refused', async () => {
  await turnOn();
  const asManager = await putIdentity(manager, { themeId: 'cozy-night', variantId: 'ember' });
  assert.equal(asManager.status, 403);
  const asReceptionist = await putIdentity(receptionist, { themeId: 'cozy-night', variantId: 'ember' });
  assert.equal(asReceptionist.status, 403);
  const asAdmin = await putIdentity(admin, { themeId: 'cozy-night', variantId: 'ember' });
  assert.equal(asAdmin.status, 403);
  const anonymous = await putIdentity(null, { themeId: 'cozy-night', variantId: 'ember' });
  assert.equal(anonymous.status, 401);
  assert.equal((await Business.findOne({ slug: SLUG }))!.identity.themeId, undefined);
});

test('an owner only ever changes their own café', async () => {
  await turnOn();
  await Business.updateOne({ _id: otherCafeId }, { $set: { identity: { enabled: true } } });
  try {
    const res = await putIdentity(otherOwner, { themeId: 'modern-minimal', variantId: 'ocean' });
    assert.equal(res.status, 200);
    assert.equal((await Business.findOne({ slug: SLUG }))!.identity.themeId, undefined);
    assert.equal((await Business.findById(otherCafeId))!.identity.themeId, 'modern-minimal');
  } finally {
    await Business.updateOne({ _id: otherCafeId }, { $unset: { identity: '' } });
  }
});

// ── super admin: PUT /admin/businesses/:id/identity ─────────────────────────

test('a super admin switches a café on: enabledAt is set and the public block turns on', async () => {
  const before = Date.now();
  const res = await putAdmin(artisanId, { enabled: true });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.enabled, true);
  assert.equal(res.body.data.theme, null);

  const biz = await Business.findOne({ slug: SLUG });
  assert.equal(biz!.identity.enabled, true);
  assert.ok(biz!.identity.enabledAt instanceof Date);
  assert.ok(biz!.identity.enabledAt!.getTime() >= before - 1000);

  const pub = await request(h.app).get(`/api/v1/public/c/${SLUG}`);
  assert.equal(pub.body.data.identity.enabled, true);
});

test('switching on again does not move enabledAt; switching off keeps the café record', async () => {
  await putAdmin(artisanId, { enabled: true });
  const first = (await Business.findOne({ slug: SLUG }))!.identity.enabledAt!;
  await new Promise((r) => setTimeout(r, 15));
  await putAdmin(artisanId, { enabled: true });
  assert.equal((await Business.findOne({ slug: SLUG }))!.identity.enabledAt!.getTime(), first.getTime());

  const off = await putAdmin(artisanId, { enabled: false });
  assert.equal(off.status, 200);
  assert.equal(off.body.data.enabled, false);
  assert.equal((await Business.findOne({ slug: SLUG }))!.identity.enabled, false);
});

test('a super admin can set and clear a theme, even while the café is still off', async () => {
  const set = await putAdmin(artisanId, { themeId: 'warm-classic', variantId: 'terracotta' });
  assert.equal(set.status, 200, JSON.stringify(set.body));
  let biz = await Business.findOne({ slug: SLUG });
  assert.equal(biz!.identity.themeId, 'warm-classic');
  assert.equal(biz!.identity.variantId, 'terracotta');
  assert.ok(biz!.identity.appliedAt instanceof Date);
  assert.equal(biz!.identity.enabled, false);

  const on = await putAdmin(artisanId, { enabled: true });
  assert.deepEqual(on.body.data.theme, { id: 'warm-classic', variantId: 'terracotta' });

  const cleared = await putAdmin(artisanId, { themeId: null });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.data.theme, null);
  biz = await Business.findOne({ slug: SLUG });
  assert.equal(biz!.identity.themeId, undefined);
  assert.equal(biz!.identity.variantId, undefined);
  assert.equal(biz!.identity.enabled, true);
});

test('the admin endpoint validates the theme, the switch and the café', async () => {
  const badTheme = await putAdmin(artisanId, { themeId: 'street-bold', variantId: 'x' });
  assert.equal(badTheme.status, 400);
  assert.equal(badTheme.body.error.code, 'INVALID_THEME');

  const badSwitch = await putAdmin(artisanId, { enabled: 'yes' });
  assert.equal(badSwitch.status, 400);
  assert.equal(badSwitch.body.error.code, 'VALIDATION_ERROR');

  const missing = await putAdmin('64b7f0f0f0f0f0f0f0f0f0f0', { enabled: true });
  assert.equal(missing.status, 404);
  const malformed = await putAdmin('not-an-id', { enabled: true });
  assert.equal(malformed.status, 404);
  assert.equal((await Business.findOne({ slug: SLUG }))!.identity.enabled, false);
});

test('only a super admin may use the admin endpoint', async () => {
  const asOwner = await putAdmin(artisanId, { enabled: true }, owner);
  assert.equal(asOwner.status, 403);
  const asManager = await putAdmin(artisanId, { enabled: true }, manager);
  assert.equal(asManager.status, 403);
  assert.equal((await Business.findOne({ slug: SLUG }))!.identity.enabled, false);
});

// ── house specials: PUT /menu/products/:id/house-special ────────────────────

const putSpecial = (token: string | null, productId: string, body: object) => {
  const req = request(h.app).put(`/api/v1/menu/products/${productId}/house-special`);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.send(body);
};

let dishIds: string[] = [];
const makeDishes = async () => {
  if (dishIds.length) return dishIds;
  const category = await Category.findOne({ businessId: artisanId });
  const created = await Product.create(
    [1, 2, 3, 4, 5].map((n) => ({ businessId: artisanId, categoryId: category!._id, name: `House dish ${n}`, pricePaise: 10000 + n }))
  );
  dishIds = created.map((p) => p._id.toString());
  return dishIds;
};
const clearSpecials = () => Product.updateMany({ businessId: artisanId }, { $set: { isHouseSpecial: false } });
const specialCount = () => Product.countDocuments({ businessId: artisanId, isHouseSpecial: true });

test('the limit is three house specials per café', () => {
  assert.equal(HOUSE_SPECIAL_MAX, 3);
});

test('an owner marks up to three house specials; the fourth is HOUSE_SPECIAL_LIMIT', async () => {
  const ids = await makeDishes();
  await clearSpecials();
  for (const id of ids.slice(0, 3)) {
    const res = await putSpecial(owner, id, { on: true });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.data, { productId: id, isHouseSpecial: true });
  }
  const fourth = await putSpecial(owner, ids[3], { on: true });
  assert.equal(fourth.status, 400);
  assert.equal(fourth.body.success, false);
  assert.equal(fourth.body.error.code, 'HOUSE_SPECIAL_LIMIT');
  assert.equal(await specialCount(), 3);
  assert.equal((await Product.findById(ids[3]))!.isHouseSpecial, false);
});

test('turning one off lets another go on', async () => {
  const ids = await makeDishes();
  await clearSpecials();
  for (const id of ids.slice(0, 3)) await putSpecial(owner, id, { on: true });

  const off = await putSpecial(owner, ids[0], { on: false });
  assert.equal(off.status, 200);
  assert.deepEqual(off.body.data, { productId: ids[0], isHouseSpecial: false });

  const next = await putSpecial(owner, ids[3], { on: true });
  assert.equal(next.status, 200, JSON.stringify(next.body));
  assert.equal(await specialCount(), 3);
});

test('repeating a request is harmless, even at the limit', async () => {
  const ids = await makeDishes();
  await clearSpecials();
  for (const id of ids.slice(0, 3)) await putSpecial(owner, id, { on: true });

  const again = await putSpecial(owner, ids[0], { on: true });
  assert.equal(again.status, 200);
  assert.equal(again.body.data.isHouseSpecial, true);
  const offTwice = await putSpecial(owner, ids[4], { on: false });
  assert.equal(offTwice.status, 200);
  assert.equal(await specialCount(), 3);
});

test('a dish archived from the menu no longer counts against the limit', async () => {
  const ids = await makeDishes();
  await clearSpecials();
  for (const id of ids.slice(0, 3)) await putSpecial(owner, id, { on: true });
  await Product.updateOne({ _id: ids[0] }, { $set: { isDeleted: true } });
  try {
    const res = await putSpecial(owner, ids[3], { on: true });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const deletedOne = await putSpecial(owner, ids[0], { on: true });
    assert.equal(deletedOne.status, 404);
  } finally {
    await Product.updateOne({ _id: ids[0] }, { $set: { isDeleted: false } });
  }
});

test('a manager may mark house specials; a receptionist and an anonymous caller may not', async () => {
  const ids = await makeDishes();
  await clearSpecials();
  const asManager = await putSpecial(manager, ids[0], { on: true });
  assert.equal(asManager.status, 200, JSON.stringify(asManager.body));
  assert.equal((await Product.findById(ids[0]))!.isHouseSpecial, true);

  const asReceptionist = await putSpecial(receptionist, ids[1], { on: true });
  assert.equal(asReceptionist.status, 403);
  const anonymous = await putSpecial(null, ids[1], { on: true });
  assert.equal(anonymous.status, 401);
  assert.equal((await Product.findById(ids[1]))!.isHouseSpecial, false);
});

test('house specials are scoped to the caller\'s café; bad ids and bodies are rejected', async () => {
  const ids = await makeDishes();
  await clearSpecials();
  const foreign = await putSpecial(otherOwner, ids[0], { on: true });
  assert.equal(foreign.status, 404);
  assert.equal(foreign.body.error.code, 'PRODUCT_NOT_FOUND');
  assert.equal((await Product.findById(ids[0]))!.isHouseSpecial, false);

  const unknown = await putSpecial(owner, '64b7f0f0f0f0f0f0f0f0f0f0', { on: true });
  assert.equal(unknown.status, 404);
  const malformed = await putSpecial(owner, 'nope', { on: true });
  assert.equal(malformed.status, 404);

  for (const body of [{}, { on: 'true' }, { on: 1 }]) {
    const res = await putSpecial(owner, ids[0], body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  }
});

test('the general product update cannot be used to get round the limit', async () => {
  const ids = await makeDishes();
  await clearSpecials();
  const res = await request(h.app)
    .put(`/api/v1/menu/products/${ids[0]}`)
    .set('Authorization', `Bearer ${owner}`)
    .send({ isHouseSpecial: true, name: 'House dish 1' });
  assert.equal(res.status, 200);
  assert.equal((await Product.findById(ids[0]))!.isHouseSpecial, false);
});

test('simultaneous requests can never push a café past the limit', async () => {
  const ids = await makeDishes();
  await clearSpecials();
  const results = await Promise.all(ids.map((id) => putSpecial(owner, id, { on: true })));
  for (const res of results) {
    assert.ok(res.status === 200 || (res.status === 400 && res.body.error.code === 'HOUSE_SPECIAL_LIMIT'), JSON.stringify(res.body));
  }
  assert.ok((await specialCount()) <= HOUSE_SPECIAL_MAX);
});
