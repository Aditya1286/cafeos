import mongoose from 'mongoose';
import { Business } from '../models/Business';
import { config } from '../config';

export interface AnalyticsScope {
  /** Whether demo exclusion is switched on at all (config.excludeDemoBusinessesFromAnalytics). */
  enabled: boolean;
  /** Businesses left out of platform analytics — empty when `enabled` is false. */
  excludedBusinessIds: mongoose.Types.ObjectId[];
  /** Spread into any $match / find() on a collection keyed by `businessId` (Order, FinancialLedger, User, ...). */
  byBusinessId: Record<string, any>;
  /** Spread into a $match / find() on the Business collection itself. */
  byBusinessDoc: Record<string, any>;
}

/**
 * Resolves which businesses platform-wide super admin analytics should ignore. Looked up once
 * per request and reused across that request's aggregations, rather than $lookup-ing Business
 * inside every pipeline — the demo set is tiny, and a `$nin` on the already-indexed
 * `businessId` keeps each existing query shape unchanged.
 *
 * `$nin` also matches documents with no `businessId` at all (e.g. the SUPER_ADMIN user), so
 * those are never accidentally dropped.
 */
export const getAnalyticsScope = async (): Promise<AnalyticsScope> => {
  if (!config.excludeDemoBusinessesFromAnalytics) {
    return { enabled: false, excludedBusinessIds: [], byBusinessId: {}, byBusinessDoc: {} };
  }

  const demo = await Business.find({ isDemo: true }).select('_id').lean();
  const ids = demo.map((b) => b._id);
  if (ids.length === 0) {
    return { enabled: true, excludedBusinessIds: [], byBusinessId: {}, byBusinessDoc: {} };
  }

  return {
    enabled: true,
    excludedBusinessIds: ids,
    byBusinessId: { businessId: { $nin: ids } },
    byBusinessDoc: { _id: { $nin: ids } }
  };
};
