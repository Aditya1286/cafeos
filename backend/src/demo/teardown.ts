import mongoose from 'mongoose';
import { Business } from '../models/Business';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { VerifiedPhone } from '../models/VerifiedPhone';
import { deleteFile } from '../services/storage';
import { DEMO_CAFES } from './cafes';
import { DemoSimState } from './models/DemoSimState';
import { DemoOrderPlan } from './models/DemoOrderPlan';

// Removes every trace of the demo cafés from the database — the undo for this whole folder.
//
// Every tenant collection in the app keys its rows by `businessId`, so instead of a hand-kept list
// this sweeps every collection for the demo cafés' ids: orders, ledger, fees, menu, tables, logins,
// and anything an owner may have added from the dashboard (photos, support tickets, inventory...),
// including collections added to the app later. Only businesses flagged isDemo under the demo slugs
// are touched; a real business that owns one of those slugs is reported and left alone.

export interface TeardownReport {
  removedCafes: string[];
  skippedRealBusinesses: string[];
  deleted: Record<string, number>;
}

export const removeDemoCafes = async (): Promise<TeardownReport> => {
  const db = mongoose.connection.db!;
  const slugs = DEMO_CAFES.map((cafe) => cafe.slug);
  const demo = await Business.find({ slug: { $in: slugs }, isDemo: true });
  const skipped = await Business.find({ slug: { $in: slugs }, isDemo: { $ne: true } }).select('slug');
  const ids = demo.map((business) => business._id);
  const deleted: Record<string, number> = {};

  if (ids.length) {
    // Uploaded photos first, while the documents still say where they are (an S3 object isn't in
    // the database, so the sweep below wouldn't reach it). deleteFile never throws.
    const [products, users] = await Promise.all([
      Product.find({ businessId: { $in: ids } }).select('imageUrl'),
      User.find({ businessId: { $in: ids } }).select('avatarUrl')
    ]);
    const urls = [
      ...products.map((p) => p.imageUrl),
      ...users.map((u) => u.avatarUrl),
      ...demo.flatMap((b) => [b.logoUrl, b.coverImageUrl])
    ].filter((url): url is string => !!url);
    for (const url of urls) await deleteFile(url);

    for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
      if (name.startsWith('system.') || name === Business.collection.collectionName) continue;
      const { deletedCount } = await db.collection(name).deleteMany({ businessId: { $in: ids } });
      if (deletedCount) deleted[name] = deletedCount;
    }
    deleted[Business.collection.collectionName] = (await Business.deleteMany({ _id: { $in: ids } })).deletedCount;
  }

  // The OTP records the bot creates are removed right after each order; sweep any a crash left
  // behind. Demo numbers start with 5 (stored as 915…), which no real Indian mobile does.
  const phones = (await VerifiedPhone.deleteMany({ mobile: /^915\d{9}$/ })).deletedCount;
  if (phones) deleted[VerifiedPhone.collection.collectionName] = phones;

  // The simulation's own bookkeeping collections exist only for the demo: drop them outright.
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const model of [DemoSimState, DemoOrderPlan]) {
    if (existing.has(model.collection.collectionName)) await model.collection.drop();
  }

  return { removedCafes: demo.map((b) => b.slug), skippedRealBusinesses: skipped.map((b) => b.slug), deleted };
};
