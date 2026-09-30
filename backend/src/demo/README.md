# Demo cafés

Three made-up Bangalore cafés whose orders are simulated, so the customer pages and the owner
dashboards (kitchen board, sales, analytics, fees) have something real to show.

| Café | Slug | Modelled on | Style |
|---|---|---|---|
| Loamline Coffee Roasters | `loamline-coffee` | Third Wave Coffee | Third-wave specialty coffee, 10 tables, 5% GST |
| Chiguru Tiffin Room | `chiguru-tiffin-room` | CTR, Brahmin's Coffee Bar, The Rameshwaram Cafe | Darshini, counter only, prices incl. GST |
| Crumbwell Bakehouse | `crumbwell-bakehouse` | Glen's Bakehouse | Bakery café, 6 tables, 5% GST |

Names, phone numbers (they start with 5, which no Indian mobile does) and emails
(`@example.com`) belong to nobody. Menus and price levels follow each model café's public
listings; the pages used are in each `cafes/*.ts` file's `sources`. No photos: the menu shows
its neutral tile instead of pictures that aren't ours.

## Switching it on

Add to `config.<env>.json`:

```json
"DEMO_TICK_KEY": "<48+ random characters>",
"DEMO_ACCOUNT_PASSWORD": "<password for the demo owner/kitchen logins>",
"DEMO_BACKFILL_DAYS": 30,
"DEMO_KEEP_DAYS": 45
```

`DEMO_KEEP_DAYS` bounds the demo's footprint on the 512 MB free cluster: once a day each tick
deletes demo data older than that (orders, their ledger rows, fee periods, counters). 30 days of
the three cafés measure about 18 MB of data plus ~2 MB of indexes, so 45 days sits around 30 MB.
It can't go below 35, so every dashboard window (this week vs last week, 30-day popular items and
kitchen speed) stays covered. Keep it at or above `DEMO_BACKFILL_DAYS`.

Generate a key with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
Without `DEMO_TICK_KEY` (or with one shorter than 24 characters) the endpoints return 404.

Then call the tick every few minutes, e.g. from a laptop cron:

```
*/5 * * * * curl -fsS -X POST -H "X-Demo-Key: <key>" https://<your-domain>/api/v1/demo/tick >> ~/demo-cafes.log 2>&1
```

The first tick creates the cafés and fills in their order history (a few ticks if the database
is remote). After that, each tick turns the last few minutes of customer arrivals into live
orders and moves orders through the kitchen. If the laptop was off, the missed stretch is filled
in as history on the next tick, so the charts have no gaps.

`GET /api/v1/demo/status` (same header) shows each café's orders and today's revenue.

Owner logins: `owner.<slug>@example.com` with `DEMO_ACCOUNT_PASSWORD`.

## How it's built

Everything lives in this folder; the only line outside it mounts `demo.routes.ts` in `server.ts`.

- **Live orders** go through the app's own HTTP API: `POST /public/orders` for the customer,
  `PUT /orders/:id/status` for the kitchen (as the café's "Kitchen Team" staff login),
  `PUT /public/orders/:id/cancel` and `/mark-paid` for the customer's own actions. So pricing,
  order numbers, tables, ledger and sockets all come from the existing code.
- **History** is written straight to the existing models (thousands of orders, with their past
  timestamps), in the shape the live code leaves orders in. `pricing.ts` mirrors
  `prepareOrder`'s maths; `tests/demo.test.ts` checks the two agree.
- **Fees**: billing periods come from the existing `ensureClosedRemittancePeriods`; the demo
  cafés pay theirs on time, so they never show as overdue.
- Only businesses flagged `isDemo` under these slugs are ever touched. If a real business owns
  one of the slugs, that café is skipped.

## Removing the demo

In this order — the data removal needs the demo code, so it comes before deleting the code:

1. **Stop the ticks** (on the laptop running the cron job):
   `crontab -l | grep -v cafeos-demo/tick.sh | crontab - && rm -rf ~/cafeos-demo`
2. **Delete the data** (on the server): `docker compose exec backend node dist/demo/cli.js remove --yes`
   It removes the three cafés and everything tied to them in every collection — orders, ledger,
   fees, menu, tables, logins, and anything an owner added (photos, tickets...) — then drops the
   demo's own collections (`demosimstates`, `demoorderplans`). A real business that owns one of
   the demo slugs is left alone and listed in the output. Nothing else is touched.
3. **Delete the code** (in the repo):
   `git rm -r -q backend/src/demo backend/tests/demo.test.ts && sed -i "/demo\/demo.routes/d; /'\/api\/v1\/demo'/d" backend/src/server.ts`
   (those two `server.ts` lines — the import and the `app.use` — are the only trace outside this
   folder). Then drop the `DEMO_*` keys from `config.production.json`, rebuild and deploy.

To only pause it, remove `DEMO_TICK_KEY` from the config: the endpoints return 404 and nothing
runs, while the cafés and their data stay as they are.

## Command line

```
npx ts-node src/demo/cli.ts status        # (Docker image: node dist/demo/cli.js status)
npx ts-node src/demo/cli.ts backfill      # create the cafés + history now, no live orders
npx ts-node src/demo/cli.ts prune         # prune now instead of waiting for the daily one
npx ts-node src/demo/cli.ts remove --yes  # delete the demo cafés and every trace of them
```

These use the database in `config.<NODE_ENV>.json`; check the host they print first.
