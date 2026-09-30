import mongoose from 'mongoose';
import { connectDB } from '../database';
import { runDemoTick } from './tick';
import { getDemoStatus, resetDemoCafes } from './status';

// Demo cafés from the command line, against the database in config.<NODE_ENV>.json:
//
//   npx ts-node src/demo/cli.ts status          (in the Docker image: node dist/demo/cli.js status)
//   npx ts-node src/demo/cli.ts backfill        create the cafés and fill in their order history now,
//                                              instead of over the first few ticks (no live orders)
//   npx ts-node src/demo/cli.ts reset --yes     delete the demo cafés and everything they produced
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
  } else if (command === 'reset' && flag === '--yes') {
    console.log(`[demo] Removed: ${(await resetDemoCafes()).join(', ') || 'nothing'}`);
  } else {
    console.log('Usage: demo/cli.ts status | backfill | reset --yes');
  }
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('[demo] Failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
