// Menu edits may only change a menu item's/category's own editable fields — never which café it
// belongs to, its deleted flag, or anything else smuggled into the request body.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, businessIdFor, Harness } from './helpers';
import { Product } from '../src/models/Product';
import { Category } from '../src/models/Category';

let h: Harness;
let artisanId: string;
let beanId: string;
let artisanOwner: string;
let beanOwner: string;

before(async () => {
  h = await startHarness();
  artisanId = await businessIdFor('artisan-cafe');
  beanId = await businessIdFor('bean-and-butter');
  artisanOwner = await tokenFor('owner@artisan.com');
  beanOwner = await tokenFor('owner@beanandbutter.com');
});
after(async () => {
  await h.stop();
});

const newProduct = async () => {
  const category = await Category.findOne({ businessId: artisanId });
  return Product.create({ businessId: artisanId, categoryId: category!._id, name: 'Update Test', pricePaise: 10000 });
};
const put = (path: string, token: string, body: unknown) =>
  request(h.app).put(`/api/v1/menu${path}`).set('Authorization', `Bearer ${token}`).send(body as object);

test('an ordinary edit still saves every editable field', async () => {
  const p = await newProduct();
  const res = await put(`/products/${p._id}`, artisanOwner, {
    name: 'Renamed',
    pricePaise: 12345,
    description: 'New description',
    isVeg: false,
    imageUrl: '/api/v1/public/menu-image/abc'
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const saved = await Product.findById(p._id);
  assert.equal(saved!.name, 'Renamed');
  assert.equal(saved!.pricePaise, 12345);
  assert.equal(saved!.description, 'New description');
  assert.equal(saved!.isVeg, false);
  assert.equal(saved!.imageUrl, '/api/v1/public/menu-image/abc');
});

test('hiding and restoring an item (isAvailable) still works', async () => {
  const p = await newProduct();
  await request(h.app).delete(`/api/v1/menu/products/${p._id}`).set('Authorization', `Bearer ${artisanOwner}`);
  assert.equal((await Product.findById(p._id))!.isAvailable, false);
  const res = await put(`/products/${p._id}`, artisanOwner, { isAvailable: true });
  assert.equal(res.status, 200);
  assert.equal((await Product.findById(p._id))!.isAvailable, true);
});

test("an item cannot be moved into another café's menu", async () => {
  const p = await newProduct();
  const res = await put(`/products/${p._id}`, artisanOwner, { businessId: beanId, name: 'Still mine' });
  assert.equal(res.status, 200);
  const saved = await Product.findById(p._id);
  assert.equal(saved!.businessId.toString(), artisanId, 'businessId changed');
  assert.equal(saved!.name, 'Still mine', 'the legitimate field in the same request should still apply');
});

test('internal flags in the body are ignored', async () => {
  const p = await newProduct();
  const res = await put(`/products/${p._id}`, artisanOwner, { isDeleted: true, discountPercentage: 90 });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const saved = await Product.findById(p._id);
  assert.equal(saved!.isDeleted, false);
  assert.equal(saved!.discountPercentage, 0);
});

test('Mongo operators in the body reject the whole request, changing nothing', async () => {
  const p = await newProduct();
  const res = await put(`/products/${p._id}`, artisanOwner, {
    name: 'Renamed',
    $set: { businessId: beanId },
    $unset: { name: 1 }
  });
  assert.equal(res.status, 400, JSON.stringify(res.body));
  assert.equal(res.body.error.code, 'INVALID_INPUT');
  const saved = await Product.findById(p._id);
  assert.equal(saved!.businessId.toString(), artisanId);
  assert.equal(saved!.name, 'Update Test');
});

test("another café's owner still cannot edit the item at all", async () => {
  const p = await newProduct();
  const res = await put(`/products/${p._id}`, beanOwner, { name: 'Hijacked' });
  assert.equal(res.status, 404);
  assert.equal((await Product.findById(p._id))!.name, 'Update Test');
});

test("a category cannot be moved into another café, but can be renamed", async () => {
  const category = await Category.create({ businessId: artisanId, name: 'Specials' });
  const res = await put(`/categories/${category._id}`, artisanOwner, { businessId: beanId, name: 'Weekend Specials' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const saved = await Category.findById(category._id);
  assert.equal(saved!.businessId.toString(), artisanId, 'category businessId changed');
  assert.equal(saved!.name, 'Weekend Specials');
});

test('an item created without a photo is saved with no image, not a stock photo', async () => {
  const category = await Category.findOne({ businessId: artisanId });
  const res = await request(h.app)
    .post('/api/v1/menu/products')
    .set('Authorization', `Bearer ${artisanOwner}`)
    .send({ name: 'No Photo Item', categoryId: category!._id, pricePaise: 5000, imageUrl: '' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.data.imageUrl, '');
});
