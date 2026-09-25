import mongoose from 'mongoose';
import { connectDB } from '../database';
import { Business } from '../models/Business';

// One-off: every business that already existed before Business.isDemo was introduced is an
// internal/test account, so flag them all as demo. Only businesses with NO isDemo field are
// touched — anything registered since (stored with isDemo: false) or already set by a super
// admin is left alone, so this is safe to re-run.
//
//   npm run mark-demo              -> dry run: lists what would change, writes nothing
//   npm run mark-demo -- --apply   -> actually sets isDemo: true on those businesses
//
// Uses the same config as the server (config.<NODE_ENV>.json), so check the database it
// prints before passing --apply.
const run = async () => {
  const apply = process.argv.includes('--apply');
  await connectDB();
  console.log(`[mark-demo] Database: ${mongoose.connection.host}/${mongoose.connection.name}`);

  const filter = { isDemo: { $exists: false } };
  const pending = await Business.find(filter).select('name slug').lean();

  if (pending.length === 0) {
    console.log('[mark-demo] Nothing to do — every business already has an isDemo value.');
  } else if (!apply) {
    console.log(`[mark-demo] DRY RUN — would mark ${pending.length} business(es) as demo:`);
    pending.forEach((b) => console.log(`  - ${b.name} (/c/${b.slug})`));
    console.log('[mark-demo] Re-run with --apply to write these changes.');
  } else {
    const result = await Business.updateMany(filter, { $set: { isDemo: true } });
    console.log(`[mark-demo] Marked ${result.modifiedCount} business(es) as demo.`);
  }

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('[mark-demo] Failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
