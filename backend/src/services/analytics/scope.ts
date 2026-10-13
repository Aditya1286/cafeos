import mongoose from 'mongoose';
import { OrderScope } from '../../dao/analytics.dao';
import { Product } from '../../models/Product';
import { hoursForDayparts } from './dayparts';
import { hasItemFilters } from './filters';
import { MetricContext } from './types';

export interface ScopeOptions {
  payment: 'paid' | 'any';
  excludeCancelled: boolean;
}

/** What counts as revenue: payment collected, order not cancelled or refunded. */
export const REVENUE: ScopeOptions = { payment: 'paid', excludeCancelled: true };
/** Orders the kitchen actually worked on: any payment state, not cancelled. */
export const KITCHEN: ScopeOptions = { payment: 'any', excludeCancelled: true };
/** Every order placed, cancelled ones included. */
export const ALL_ORDERS: ScopeOptions = { payment: 'any', excludeCancelled: false };

/**
 * Products that pass the item filters (category, veg), or null when none are set (or this metric
 * does not honour them). Soft-deleted products are included: old orders still contain them.
 */
export const itemFilterProductIds = (ctx: MetricContext): Promise<mongoose.Types.ObjectId[] | null> =>
  ctx.memo('itemFilter', async () => {
    if (!ctx.apply.itemFilters || !hasItemFilters(ctx.filters)) return null;
    const query: Record<string, unknown> = { businessId: ctx.businessId };
    if (ctx.filters.categoryIds.length) query.categoryId = { $in: ctx.filters.categoryIds.map((id) => new mongoose.Types.ObjectId(id)) };
    if (ctx.filters.veg) query.isVeg = ctx.filters.veg === 'veg';
    const products = await Product.find(query).select('_id').lean();
    return products.map((p) => p._id as mongoose.Types.ObjectId);
  });

/** The order scope for this metric over the current or the comparison period. */
export const scopeFor = async (ctx: MetricContext, which: 'current' | 'compare', options: ScopeOptions): Promise<OrderScope> => {
  const range = which === 'current' ? ctx.range : ctx.compareRange;
  if (!range) throw new Error('No comparison range for this request.');
  const sliced = ctx.apply.slices;
  return {
    businessId: ctx.businessId,
    timezone: ctx.timezone,
    start: range.start,
    end: range.end,
    ...options,
    sources: sliced ? ctx.filters.source : [],
    paymentMethods: sliced ? ctx.filters.paymentMethod : [],
    hours: sliced && ctx.filters.daypart.length ? hoursForDayparts(ctx.filters.daypart) : null,
    productIds: await itemFilterProductIds(ctx),
  };
};
