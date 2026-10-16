// "Upload Menu": photos go to the AI service and come back as a draft (nothing saved), then the
// owner-reviewed draft is written to the menu — reusing categories by name, never duplicating
// items, and always scoped to the caller's own café.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';
import { startHarness, tokenFor, businessIdFor, Harness } from './helpers';
import { config } from '../src/config';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';

let h: Harness;
let artisanId: string;
let beanId: string;
let artisanOwner: string;
let artisanReceptionist: string;

// Stand-in for the AI service: records what it was sent, answers with `aiReply`.
let ai: http.Server;
let aiCalls: { headers: http.IncomingHttpHeaders; body: any }[] = [];
let aiReply: { status: number; body: unknown } = { status: 200, body: {} };

const PHOTO = 'data:image/jpeg;base64,' + Buffer.from('fake-jpeg-bytes').toString('base64');

const aiMenu = {
  code: 200,
  log_id: 'log-123',
  request_id: 'req-1',
  status: 'partial',
  cache_hit: false,
  menu: {
    currency: 'INR',
    categories: [
      {
        name: 'Hot Coffee',
        description: '',
        displayOrder: 0,
        items: [
          {
            name: 'Cappuccino', description: 'Double shot', pricePaise: 18000, imageUrl: null, isVeg: true,
            isVegSource: 'marker', variants: [], addons: [{ name: 'Extra Shot', pricePaise: 4000 }],
            displayOrder: 0, confidence: 0.95, warnings: [], source: { page: 1 }
          },
          {
            name: 'Mocha', description: '', pricePaise: null, imageUrl: null, isVeg: true, isVegSource: 'inferred',
            variants: [], addons: [], displayOrder: 1, confidence: 0.4, warnings: ['price_missing', 'low_confidence'],
            source: { page: 1 }
          }
        ]
      }
    ]
  },
  summary: { categories: 1, items: 2, pages: 2, pages_failed: 1 },
  warnings: ['page_1_unreadable: Ch??se Toast'],
  page_errors: [{ page: 2, error: 'parse failed' }]
};

before(async () => {
  h = await startHarness();
  artisanId = await businessIdFor('artisan-cafe');
  beanId = await businessIdFor('bean-and-butter');
  artisanOwner = await tokenFor('owner@artisan.com');
  artisanReceptionist = await tokenFor('staff@artisan.com');

  ai = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      aiCalls.push({ headers: req.headers, body: raw ? JSON.parse(raw) : null });
      res.writeHead(aiReply.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(aiReply.body));
    });
  });
  await new Promise<void>((resolve) => ai.listen(0, '127.0.0.1', resolve));
  config.aiService.url = `http://127.0.0.1:${(ai.address() as AddressInfo).port}`;
  config.aiService.key = 'test-service-key';
});

after(async () => {
  await new Promise<void>((resolve) => ai.close(() => resolve()));
  await h.stop();
});

beforeEach(() => {
  aiCalls = [];
  aiReply = { status: 200, body: aiMenu };
});

const post = (path: string, token: string, body: unknown) =>
  request(h.app).post(`/api/v1/menu/import${path}`).set('Authorization', `Bearer ${token}`).send(body as object);

// ── Step 1: extract ──────────────────────────────────────────────────────────

test('extract sends the photos to the AI service and returns an unsaved draft', async () => {
  const productsBefore = await Product.countDocuments({ businessId: artisanId });

  const res = await post('/extract', artisanOwner, { images: [PHOTO, PHOTO] });

  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(aiCalls.length, 1);
  assert.equal(aiCalls[0].headers['x-service-key'], 'test-service-key');
  assert.equal(aiCalls[0].body.business_id, artisanId);
  assert.deepEqual(aiCalls[0].body.images, [PHOTO, PHOTO]);

  const draft = res.body.data;
  assert.equal(draft.aiLogId, 'log-123');
  assert.equal(draft.status, 'partial');
  assert.equal(draft.categories[0].name, 'Hot Coffee');
  assert.deepEqual(
    draft.categories[0].items.map((i: any) => [i.name, i.pricePaise, i.warnings]),
    [['Cappuccino', 18000, []], ['Mocha', null, ['price_missing', 'low_confidence']]]
  );
  assert.deepEqual(draft.notes, ["Photo 2 couldn't be read.", 'Couldn\'t read on photo 1: "Ch??se Toast"']);
  assert.equal(await Product.countDocuments({ businessId: artisanId }), productsBefore, 'nothing saved yet');
});

// With S3 storage (production) the photos are saved to the bucket and the AI gets links, not bytes.
const withStubS3 = async (status: number, run: (puts: string[]) => Promise<void>) => {
  const puts: string[] = [];
  const s3 = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      if (req.method === 'PUT') puts.push(req.url || '');
      res.writeHead(status, { ETag: '"stub"' });
      res.end();
    });
  });
  await new Promise<void>((resolve) => s3.listen(0, '127.0.0.1', resolve));
  const saved = { driver: config.storageDriver, s3: { ...config.s3 } };
  config.storageDriver = 's3';
  Object.assign(config.s3, {
    bucket: 'menu-items',
    region: 'auto',
    endpoint: `http://127.0.0.1:${(s3.address() as AddressInfo).port}`,
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    publicBaseUrl: 'https://cdn.example.test'
  });
  try {
    await run(puts);
  } finally {
    config.storageDriver = saved.driver;
    Object.assign(config.s3, saved.s3);
    await new Promise<void>((resolve) => s3.close(() => resolve()));
  }
};

test('with S3 storage the photos are saved under menu-imports/ and sent to the AI as https links', async () => {
  await withStubS3(200, async (puts) => {
    const res = await post('/extract', artisanOwner, { images: [PHOTO, PHOTO] });
    assert.equal(res.status, 200, JSON.stringify(res.body));

    assert.equal(puts.length, 2);
    const sent: { url: string; sha256: string }[] = aiCalls[0].body.images;
    assert.equal(sent.length, 2);
    for (const photo of sent) {
      assert.match(photo.url, new RegExp(`^https://cdn\\.example\\.test/menu-imports/${artisanId}/[0-9a-f-]{36}\\.jpg$`));
      // The photo's own fingerprint, so a re-upload under a new URL is still recognised.
      assert.equal(photo.sha256, crypto.createHash('sha256').update('fake-jpeg-bytes').digest('hex'));
    }
    assert.notEqual(sent[0].url, sent[1].url, 'each page is its own object');
  });
});

test('if saving the photos to S3 fails, they are sent inline and the import still works', async () => {
  await withStubS3(500, async () => {
    const res = await post('/extract', artisanOwner, { images: [PHOTO] });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(aiCalls[0].body.images, [PHOTO]);
  });
});

test('extract rejects bad photos without calling the AI service', async () => {
  for (const images of [[], undefined, ['data:image/svg+xml;base64,PHN2Zz4='], Array(7).fill(PHOTO)]) {
    const res = await post('/extract', artisanOwner, { images });
    assert.equal(res.status, 400, JSON.stringify(images)?.slice(0, 60));
  }
  assert.equal(aiCalls.length, 0);
});

test('extract maps AI failures to clear errors', async () => {
  aiReply = { status: 422, body: { code: 422, error: 'No menu items found' } };
  let res = await post('/extract', artisanOwner, { images: [PHOTO] });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, 'MENU_NOT_READABLE');

  aiReply = { status: 502, body: { code: 502, error: 'upstream' } };
  res = await post('/extract', artisanOwner, { images: [PHOTO] });
  assert.equal(res.status, 502);
  assert.equal(res.body.error.code, 'AI_UNAVAILABLE');

  const realUrl = config.aiService.url;
  config.aiService.url = 'http://127.0.0.1:1'; // nothing listens there
  try {
    res = await post('/extract', artisanOwner, { images: [PHOTO] });
    assert.equal(res.status, 502);
    assert.equal(res.body.error.code, 'AI_UNAVAILABLE');
  } finally {
    config.aiService.url = realUrl;
  }
});

test('only owners/managers can import a menu', async () => {
  const res = await post('/extract', artisanReceptionist, { images: [PHOTO] });
  assert.equal(res.status, 403);
  const commit = await post('/commit', artisanReceptionist, { categories: [] });
  assert.equal(commit.status, 403);
});

// ── Step 2: commit ───────────────────────────────────────────────────────────

test('commit creates new categories and items with no photos, and reuses existing categories by name', async () => {
  const res = await post('/commit', artisanOwner, {
    categories: [
      {
        name: 'Hot Coffee',
        items: [
          {
            name: 'Cappuccino', description: 'Double shot', pricePaise: 18000, isVeg: true,
            variants: [], addons: [{ name: 'Extra Shot', pricePaise: 4000 }]
          },
          {
            name: 'Latte', pricePaise: 99999, isVeg: true,
            variants: [{ name: 'Regular', pricePaise: 19000 }, { name: 'Large', pricePaise: 24000 }]
          }
        ]
      },
      // Matches the seeded "Specialty Coffee" category despite the different casing.
      { name: 'specialty coffee', items: [{ name: 'Flat White', pricePaise: 21000, isVeg: true }] }
    ]
  });

  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.deepEqual(res.body.data, { categoriesCreated: 1, categoriesReused: 1, itemsCreated: 3, itemsSkipped: [] });

  const hot = await Category.findOne({ businessId: artisanId, name: 'Hot Coffee' });
  assert.ok(hot);
  const latte = await Product.findOne({ businessId: artisanId, name: 'Latte' });
  assert.equal(latte!.categoryId.toString(), hot!._id.toString());
  assert.equal(latte!.pricePaise, 19000, 'base price is the cheapest size, whatever was sent');
  assert.equal(latte!.imageUrl, '');
  const cappuccino = await Product.findOne({ businessId: artisanId, name: 'Cappuccino' });
  assert.deepEqual(cappuccino!.addons.map((a) => [a.name, a.pricePaise]), [['Extra Shot', 4000]]);

  const specialty = await Category.findOne({ businessId: artisanId, name: 'Specialty Coffee' });
  const flatWhite = await Product.findOne({ businessId: artisanId, name: 'Flat White' });
  assert.equal(flatWhite!.categoryId.toString(), specialty!._id.toString());
  assert.equal(await Category.countDocuments({ businessId: artisanId, name: /specialty coffee/i }), 1);
});

test('importing the same items again skips the ones already on the menu', async () => {
  const res = await post('/commit', artisanOwner, {
    categories: [
      { name: 'HOT COFFEE', items: [{ name: 'cappuccino', pricePaise: 18000 }, { name: 'Americano', pricePaise: 15000 }] }
    ]
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.deepEqual(res.body.data, { categoriesCreated: 0, categoriesReused: 1, itemsCreated: 1, itemsSkipped: ['cappuccino'] });
  assert.equal(await Product.countDocuments({ businessId: artisanId, name: /^cappuccino$/i }), 1);
});

test('commit refuses items without a valid price and saves nothing', async () => {
  const before = await Product.countDocuments({ businessId: artisanId });
  for (const items of [
    [{ name: 'Mocha', pricePaise: null }],
    [{ name: 'Mocha', pricePaise: 120.5 }],
    [{ name: 'Mocha', pricePaise: -100 }],
    [{ name: '   ', pricePaise: 100 }],
    [{ name: 'Mocha', pricePaise: 100, variants: [{ name: 'Large' }] }]
  ]) {
    const res = await post('/commit', artisanOwner, { categories: [{ name: 'Brand New Section', items }] });
    assert.equal(res.status, 400, JSON.stringify(items));
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  }
  assert.equal(await Product.countDocuments({ businessId: artisanId }), before);
  assert.equal(await Category.countDocuments({ businessId: artisanId, name: 'Brand New Section' }), 0);
});

test('an import always lands in the caller’s own café, whatever the body says', async () => {
  const res = await post('/commit', artisanOwner, {
    businessId: beanId,
    categories: [{ name: 'Smuggled', businessId: beanId, items: [{ name: 'Sneaky Tea', pricePaise: 5000, businessId: beanId }] }]
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const tea = await Product.findOne({ name: 'Sneaky Tea' });
  assert.equal(tea!.businessId.toString(), artisanId);
  assert.equal(await Category.countDocuments({ businessId: beanId, name: 'Smuggled' }), 0);
});
