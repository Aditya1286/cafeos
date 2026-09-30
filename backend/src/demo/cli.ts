import mongoose from 'mongoose';
import { connectDB } from '../database';
import { runDemoTick } from './tick';
import { getDemoStatus } from './status';
import { removeDemoCafes } from './teardown';
import { DEMO_CAFES } from './cafes';
import { provisionCafe } from './provision';
import { pruneOldDemoData } from './prune';

// Demo cafés from the command line, against the database in config.<NODE_ENV>.json:
//
//   npx ts-node src/demo/cli.ts status          (in the Docker image: node dist/demo/cli.js status)
//   npx ts-node src/demo/cli.ts backfill        create the cafés and fill in their order history now,
//                                              instead of over the first few ticks (no live orders)
//   npx ts-node src/demo/cli.ts prune           delete demo data older than DEMO_KEEP_DAYS now
//                                              (ticks already do this once a day)
//   npx ts-node src/demo/cli.ts remove --yes    delete the demo cafés and every trace of them (the
//                                              undo — see README.md; if ticks keep coming they are
//                                              simply recreated, which makes this a reset too)
//
// Live orders need the running backend (they go through its HTTP API), so they only come from
// POST /api/v1/demo/tick.
const run = async () => {
  const [command, flag] = process.argv.slice(2);
  await connectDB();
  console.log(`[demo] Database: ${mongoose.connection.host}/${mongoose.connection.name}`);

  if (command === 'status') {
    console.table(await getDemoStatus());
  } else if (command === 'backfill') {
    for (let round = 1; ; round++) {
      const summary = await runDemoTick({ historyOnly: true, budgetMs: 60_000 });
      for (const cafe of summary.cafes) {
        console.log(
          `[demo] round ${round} · ${cafe.slug}: ${cafe.status === 'skipped' ? `skipped — ${cafe.reason}` : `+${cafe.historyOrders} orders, up to ${cafe.simulatedUntil?.toISOString()}`}`
        );
      }
      if (summary.caughtUp) break;
    }
    console.table(await getDemoStatus());
  } else if (command === 'prune') {
    for (const cafe of DEMO_CAFES) {
      const result = await provisionCafe(cafe);
      if (!result.ok) continue;
      console.log(`[demo] ${cafe.slug}: pruned`, await pruneOldDemoData(result.ctx, new Date(), { force: true }));
    }
  } else if ((command === 'remove' || command === 'reset') && flag === '--yes') {
    const report = await removeDemoCafes();
    console.log(`[demo] Removed cafés: ${report.removedCafes.join(', ') || 'none'}`);
    if (report.skippedRealBusinesses.length) console.log(`[demo] Left alone (real businesses): ${report.skippedRealBusinesses.join(', ')}`);
    console.log('[demo] Deleted documents per collection:', report.deleted);
  } else {
    console.log('Usage: demo/cli.ts status | backfill | prune | remove --yes');
  }
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('[demo] Failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
