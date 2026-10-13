// Deterministic orders for the analytics tests. They are inserted straight into the collection, so a
// test controls every field (time, status, payment, items, timeline) instead of going through the
// ordering flow. Test-only: lives outside src/, never shipped.
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { Order } from '../src/models/Order';
import { Product } from '../src/models/Product';
import analyticsRoutes from '../src/routes/analyticsRoutes';
import authRoutes from '../src/routes/authRoutes';
import staffRoutes from '../src/routes/staffRoutes';
import { businessIdFor, Harness, startHarness, tokenFor } from './helpers';

export interface LineSpec {
  productId: string;
  name?: string;
  pricePaise?: number;
  quantity?: number;
  addons?: { name: string; pricePaise: number }[];
}

export interface OrderSpec {
  /** createdAt, as an ISO instant. */
  at: string;
  /** Business slug; default 'artisan-cafe'. */
  business?: string;
  /** Default: one line for the café's first product, priced at subtotalPaise. */
  items?: LineSpec[];
  /** Default: the sum of the lines. */
  subtotalPaise?: number;
  discountPaise?: number;
  taxPaise?: number;
  orderStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  source?: string;
  phone?: string;
  name?: string;
  timeline?: Partial<Record<'placedAt' | 'acceptedAt' | 'preparingAt' | 'readyAt' | 'completedAt', string>>;
  cancellationReason?: string;
  refundRequestedAt?: string;
  refundedAt?: string;
  /** Fields to leave out entirely, to mimic old orders that predate them. */
  omit?: string[];
}

let seq = 0;
const firstProducts = new Map<string, { id: string; name: string }>();

const defaultProduct = async (slug: string, businessId: mongoose.Types.ObjectId) => {
  let product = firstProducts.get(slug);
  if (!product) {
    const found = await Product.findOne({ businessId });
    if (!found) throw new Error(`No product for ${slug}`);
    product = { id: String(found._id), name: found.name };
    firstProducts.set(slug, product);
  }
  return product;
};

/** Inserts the orders and returns their ids, in the order given. */
export const seedOrders = async (specs: OrderSpec[]): Promise<string[]> => {
  const docs: Record<string, unknown>[] = [];
  for (const spec of specs) {
    seq += 1;
    const slug = spec.business ?? 'artisan-cafe';
    const businessId = new mongoose.Types.ObjectId(await businessIdFor(slug));
    const product = await defaultProduct(slug, businessId);
    const lines = (spec.items ?? [{ productId: product.id, name: product.name, pricePaise: spec.subtotalPaise ?? 10_000 }]).map((l) => {
      const price = l.pricePaise ?? 10_000;
      const quantity = l.quantity ?? 1;
      const addons = l.addons ?? [];
      return {
        productId: new mongoose.Types.ObjectId(l.productId),
        name: l.name ?? 'Item',
        pricePaise: price,
        quantity,
        variantName: '',
        addons,
        itemTotalPaise: (price + addons.reduce((s, a) => s + a.pricePaise, 0)) * quantity,
        notes: '',
      };
    });
    const subtotal = spec.subtotalPaise ?? lines.reduce((s, l) => s + l.itemTotalPaise, 0);
    const discount = spec.discountPaise ?? 0;
    const tax = spec.taxPaise ?? 0;
    const createdAt = new Date(spec.at);
    const timeline: Record<string, Date> = { placedAt: createdAt };
    for (const [k, v] of Object.entries(spec.timeline ?? {})) if (v) timeline[k] = new Date(v);

    const doc: Record<string, unknown> = {
      orderId: `SEED-${seq}`,
      orderNumber: `SEED-${seq}`,
      businessId,
      tableName: 'T1',
      customerName: spec.name ?? 'Seed Customer',
      customerPhone: spec.phone ?? '9000000000',
      customerEmail: '',
      source: spec.source ?? 'QR_TABLE',
      items: lines,
      subtotalPaise: subtotal,
      discountPaise: discount,
      taxPaise: tax,
      platformFeePaise: 0,
      serviceChargePaise: 0,
      totalAmountPaise: subtotal - discount + tax,
      businessEarningsPaise: subtotal - discount + tax,
      orderStatus: spec.orderStatus ?? 'COMPLETED',
      paymentStatus: spec.paymentStatus ?? 'PAID',
      paymentMethod: spec.paymentMethod ?? 'CASH',
      notes: '',
      timeline,
      cancellationReason: spec.cancellationReason ?? '',
      createdAt,
      updatedAt: createdAt,
      __v: 0,
    };
    if (spec.refundRequestedAt) doc.refundRequestedAt = new Date(spec.refundRequestedAt);
    if (spec.refundedAt) doc.refundedAt = new Date(spec.refundedAt);
    for (const key of spec.omit ?? []) delete doc[key];
    docs.push(doc);
  }
  const result = await Order.collection.insertMany(docs as any[]);
  return Object.values(result.insertedIds).map(String);
};

/** Removes every order this helper inserted (the demo seed's own orders are left alone). */
export const clearSeededOrders = async (): Promise<void> => {
  await Order.collection.deleteMany({ orderId: /^SEED-/ });
};

/** 10 March 2025 in India: 2025-03-09T18:30Z up to (not including) 2025-03-10T18:30Z. A Monday. */
export const DAY = { from: '2025-03-10', to: '2025-03-10' };

export interface AnalyticsHarness {
  h: Harness;
  owner: string;
  beanOwner: string;
  /** POST /analytics/query as `token`. Defaults to DAY with no comparison. */
  query: (token: string, metrics: string[], filters?: Record<string, unknown>, headers?: Record<string, string>) => request.Test;
  /** One metric's data for the artisan owner (asserts it succeeded). */
  metric: (id: string, filters?: Record<string, unknown>) => Promise<any>;
  stop: () => Promise<void>;
}

/** The real app on an in-memory database, with the analytics routes mounted. */
export const startAnalyticsHarness = async (): Promise<AnalyticsHarness> => {
  const h = await startHarness();
  h.app.use('/api/v1/auth', authRoutes);
  h.app.use('/api/v1/staff', staffRoutes);
  h.app.use('/api/v1/analytics', analyticsRoutes);
  const owner = await tokenFor('owner@artisan.com');
  const beanOwner = await tokenFor('owner@beanandbutter.com');
  const query: AnalyticsHarness['query'] = (token, metrics, filters = {}, headers = {}) =>
    request(h.app)
      .post('/api/v1/analytics/query')
      .set('Authorization', `Bearer ${token}`)
      .set(headers)
      .send({ metrics, filters: { range: DAY, compare: 'none', ...filters } });
  const metric: AnalyticsHarness['metric'] = async (id, filters = {}) => {
    const res = await query(owner, [id], filters);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const outcome = res.body.results[id];
    assert.equal(outcome.ok, true, JSON.stringify(outcome));
    return outcome.data;
  };
  return { h, owner, beanOwner, query, metric, stop: () => h.stop() };
};
