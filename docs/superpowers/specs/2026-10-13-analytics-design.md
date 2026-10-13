# Owner Analytics — Design

Date: 2026-10-13 · Status: draft for review · Scope: owner dashboard → Analytics tab

## 1. Goal

Give the owner or manager of a mid-size café (roughly 50–500 orders a day, one outlet) a fast answer to six questions: *how am I doing, when am I busy, what sells, who comes back, is the kitchen keeping up, where is money slipping* — with proper filters, and **on one screen with no page scrolling**.

It is also a framework: adding a future chart means registering one metric on the backend and placing one slot in a view config on the frontend. No new endpoint, hook, or layout code.

## 2. Scope

**In:** five views (Overview, Menu, Customers, Kitchen, Money); a global filter bar; a backend metric registry behind one batched query endpoint; a one-screen frontend layout and generic chart kit; tests; removal of the old Analytics panel.

**Explicitly out** (decided with the product owner): aggregator/channel mix (Zomato/Swiggy); cost and waste (food-cost %, wastage, purchases); the popularity-vs-margin matrix as a separate chart; revenue-per-table and table turnover; export and scheduled reports; super-admin analytics; "discounts %" (discounts are always 0 today); platform-fee metrics (the fee model is changing); a business-day cutoff setting (the range builder takes a `dayStartHour` argument, default 0, so adding the setting later is a one-line change).

## 3. Definitions (one place, used by every metric)

- **Timezone and time basis.** `Business.timezone` (default `Asia/Kolkata`) for all bucketing; time basis is `Order.createdAt`.
- **Revenue order.** `paymentStatus = PAID` **and** `orderStatus` not `CANCELLED`/`REFUNDED` (a paid-then-cancelled order awaiting refund is not revenue; it shows under Money as "refund pending").
- **Net sales** = Σ(`subtotalPaise − discountPaise`) over revenue orders — excludes GST. **Total collected** = Σ `totalAmountPaise`. **GST collected** = Σ `taxPaise`. (Totals are `subtotal + tax`; service charge is unused today.)
- **Orders** = count of revenue orders. **Average ticket** = net sales ÷ orders. **Items per order** = Σ item quantity ÷ orders.
- **Cancellation rate** = orders with status `CANCELLED`/`REFUNDED` ÷ all orders created in range (any payment status).
- **Served but unpaid** = status `SERVED`/`COMPLETED` and `paymentStatus = UNPAID` (count and ₹).
- **Refunds** = Σ `totalAmountPaise` of orders created in range with `paymentStatus = REFUNDED`. **Refund pending** = `refundRequestedAt` set and `refundedAt` unset (count and ₹).
- **Dayparts** (constants): morning 05–11, afternoon 11–16, evening 16–21, night 21–05.
- **Customer** = `customerPhone` as stored (same identity the existing repeat-customer stat uses). **New** = first-ever revenue order falls inside the range; **returning** = earlier revenue order exists. **Lapsed** = ≥2 lifetime revenue orders, last one more than 30 days before range end.
- **Kitchen times.** accept = `placedAt → preparingAt` (legacy `acceptedAt`); prep = start → `readyAt`; fulfilment = `placedAt → completedAt`. Reported as **median and p90**, never a plain average. Percentiles are computed in Node over per-order durations (cap 20,000 orders; response flags `sampled: true` if capped). An order is **late** when prep exceeds the longest `Product.preparationTimeMinutes` among its items (deleted/unknown product: 15).
- **Item earnings** (per product): units, net revenue (Σ `itemTotalPaise`, pre-tax), share of item revenue, revenue change vs the compare period, and **estimated margin** = revenue − units × current recipe ingredient cost, only where a recipe exists (else `null`, shown as "—"; the Menu view shows "n of m items have recipes"). Always labelled *est.*

## 4. Filters

One filter bar above the view tabs; state is shared across views.

| Control | Values |
|---|---|
| Range | Today, Yesterday, Last 7 days, Last 30 days, This month, Last month, Custom (≤ 366 days) |
| Compare to | None, Previous period, Same period last week, Same period last year (default: previous period) |
| Granularity | Auto (≤2 days → hour, ≤31 → day, ≤120 → week, else month) or override |
| Order source | QR table, Counter/takeaway, Staff, Admin |
| Payment | UPI (direct), Cash, Card, Online checkout |
| Daypart | Morning, Afternoon, Evening, Night |
| Category, Veg/Non-veg | **Item filters** — Overview and Menu only |

Rules: slices are ANDed; empty means all. **Item filters apply at line-item level**: sales and units count only matching lines, orders = orders with ≥1 matching line, average ticket = matching sales ÷ those orders. Order-level slices (source, payment, daypart) apply on every view except **Customers**, which takes only range and compare (new-vs-returning is meaningful only across all orders). A control a view does not support is **disabled with a hint, never silently ignored**; the backend also reports `notApplied` per metric so a mismatch can never show wrong numbers unlabelled. Last-used filters persist per café in `localStorage` (the dashboard tab itself is not URL-synced, so URL state would be lost on reload; deep links are out of scope).

## 5. Backend

Follows the repo's newer layering: routes → controller → service → dao. Tenancy: `businessId` always comes from `req.businessId` (super admin via `x-business-id`, as everywhere).

**Endpoint** `POST /api/v1/analytics/query` — `protect, enforceBusiness, restrictTo('SUPER_ADMIN','OWNER','MANAGER')`, added to the existing `analyticsRoutes.ts`. The old `GET /analytics/dashboard` stays (the KPI grid and plan-usage settings still use it).

```jsonc
// request
{ "metrics": ["kpi.net_sales", "ts.sales_orders"],
  "filters": { "range": { "preset": "last7" },          // or { "from": "2026-10-01", "to": "2026-10-13" } (local dates, inclusive)
               "compare": "previous_period", "granularity": "auto",
               "source": ["QR_TABLE"], "paymentMethod": [], "daypart": [], "categoryIds": [], "veg": null } }
// response
{ "success": true,
  "meta": { "timezone": "Asia/Kolkata", "range": {"start": "...", "end": "..."}, "compareRange": {...}|null, "granularity": "day" },
  "results": { "kpi.net_sales": { "ok": true, "data": { ... } },
               "ts.sales_orders": { "ok": false, "error": { "code": "METRIC_FAILED", "message": "..." } } } }
```

**Validation** (`services/analytics/filters.ts`): strict enums, ids must be ObjectIds, range ≤ 366 days and `from ≤ to`, ≤ 16 metrics per request; invalid input → 400 in the standard error shape. An **unknown metric id** is a per-metric error, not a request failure, so a stale frontend degrades one card instead of the screen. Range/compare/granularity resolution lives in one pure module in the business timezone and is unit-tested at day, month and DST-style edges.

**Registry** (`services/analytics/registry.ts`):

```ts
interface MetricDefinition<S extends ResultShape> {
  id: string;                      // 'kpi.net_sales'
  shape: S['kind'];
  appliesItemFilters: boolean;     // false → result carries notApplied: ['category','veg']
  appliesSlices: boolean;
  compute(ctx: MetricContext): Promise<S>;   // ctx = { businessId, timezone, range, compareRange, granularity, filters }
}
```

A shared **scope builder** turns `ctx` into the Mongo `$match` (business, time range, revenue-order rule, source/payment/daypart). Item filters resolve first to a product-id set (one small `Product` query), then match on `items.productId` — no `$lookup` per request. `service.ts` runs the requested metrics in parallel, each in its own try/catch. Aggregation pipelines live in `dao/analytics.dao.ts`; business rules (definitions above) live in the metric files.

**Result shapes** — the *only* contract between metrics and charts:

| kind | payload |
|---|---|
| `kpi` | `value`, `unit` (`paise\|count\|percent\|seconds`), `previous`, `changePct`, `sparkline?` |
| `series` | `buckets[] {key,label}`, `series[] {id,label,unit,points[],previousPoints?}` |
| `ranked` | `columns[] {id,label,unit}`, `rows[] {id,label,values{},previous?}`, `truncated` |
| `breakdown` | `slices[] {id,label,value,share}`, `unit` |
| `matrix` | `rows[]`, `cols[]`, `layers{ name → number[][] }` (e.g. `orders`, `sales`) |

**Metric catalogue** (≈30, ids stable): *Overview* — `kpi.net_sales`, `kpi.orders`, `kpi.avg_ticket`, `kpi.items_per_order`, `ts.sales_orders`, `breakdown.source`, `breakdown.payment`, `ranked.avg_ticket_by_daypart`, `matrix.busy_hours`. *Menu* — `ranked.items`, `breakdown.category`, `breakdown.veg`, `kpi.addon_attach_rate`, `ranked.slow_movers`. *Customers* — `kpi.active_customers`, `ts.new_vs_returning`, `breakdown.visit_frequency`, `ranked.top_customers` (name + masked phone), `ranked.lapsed_customers`. *Kitchen* — `kpi.prep_median`, `kpi.prep_p90`, `kpi.fulfil_median`, `kpi.late_rate`, `ts.kitchen_times`, `ts.throughput_by_hour`. *Money* — `kpi.cancel_rate`, `kpi.refunds`, `kpi.refund_pending`, `kpi.unpaid_served`, `kpi.gst_collected`, `ts.cancellations`, `ranked.cancel_reasons`.

**Performance.** The existing `{businessId, createdAt}` and `{businessId, paymentStatus, createdAt}` indexes serve every range query; no new index in v1. The plan includes a seeded ~100k-order check; rollup tables are a later option if it fails.

## 6. Frontend

**One-screen layout.** On the Analytics tab the dashboard shell switches to fixed-viewport mode (`root: h-dvh flex flex-col overflow-hidden`, `main: flex-1 min-h-0`), and the live-counter `KpiStatsGrid` is hidden on this tab (the Overview view has its own KPI strip; the counters stay on other tabs). Layout inside:

- A `ScreenGrid` primitive places `ChartCard`s into a per-view CSS grid; every cell is `min-h-0 overflow-hidden`, and charts fill their cell (`ResponsiveContainer height="100%"`) — no fixed pixel heights anywhere.
- **Density.** A `useElementSize` hook gives each card `comfortable | compact`; compact drops legends and axes (sparkline + number) so a small cell still reads.
- **Nothing grows downward.** Ranked lists show the top 5–6 with **"View all →"**, which opens the existing `Modal` with the full list (scrolling inside a dialog the user asked for is fine).
- **Phones.** The grid becomes a horizontal scroll-snap **pager**, one card per screen with dots; the first slide is the KPI strip. Filters collapse into a bottom sheet.
- **Acceptance check:** on every view, `document.scrollingElement.scrollHeight ≤ window.innerHeight` at 1366×768, 1440×900 and 1920×1080 (desktop), and 390×844 (phone, pager).

**Chart kit** (`KpiCard`, `TimeSeriesChart`, `RankedList`, `DonutChart`, `Heatmap`, `ChartCard` with loading/empty/error/`notApplied` states) — each consumes a result **shape**, not a metric, so any metric of that shape can use it. Charts use `recharts` where it fits; the heatmap is a plain CSS grid. **Theming:** colours come from one `chartTheme` driven by the existing CSS variables (the current panel hard-codes light colours), including tooltips, and are verified in dark mode.

**View config.** `views.ts` maps each view to a grid template and slots `{ metricId | toggle: [metricId, metricId], component, slot, drilldown? }`, plus which filters the view supports. A slot may **toggle between two related metrics** (e.g. mix by *Source | Payment*, *Category | Veg*, *Top | Lapsed customers*) so one cell serves two. This is the only file touched to add a chart.

Per-view budget (what makes the no-scroll grid feasible): **≤ 5 KPIs + ≤ 4 chart cards.** Overview = 4 KPIs + trend, mix (toggle), average ticket by daypart, busy-hours heatmap. Menu = 1 KPI + item list, mix (toggle), slow movers. Customers = 1 KPI + new-vs-returning, visit frequency, people list (toggle). Kitchen = 4 KPIs + kitchen times, throughput by hour. Money = 5 KPIs + cancellations over time, cancel reasons.

**State and data.** `useAnalyticsView(viewId, filters)` owns the fetch (one `POST /analytics/query` per view), debounces filter changes, exposes `refresh()`, and re-fetches every 60 s while the tab is visible if the range includes today. Following the repo's hooks-per-feature and service-layer rules, the call goes through `services/dashboard/analytics`, filter parsing/defaults/persistence are pure functions in `utils/analyticsFilters.ts`, and value formatting (₹ compact, `4m 20s`, %) in `utils/analyticsFormat.ts`.

## 7. Testing

- **Backend integration** (existing `node:test` + in-memory Mongo harness), deterministic seeded orders: each metric's numbers; **tenant isolation**; each filter; compare ranges; timezone bucket edges (23:30 IST vs UTC); unpaid/cancelled exclusion (the old `topProducts` counted them); item-filter semantics; granularity auto; per-metric failure isolation (a throwing test metric); unknown metric id; validation errors; role gating (kitchen staff refused).
- **Frontend (vitest, node env):** filter defaults, serialisation, persistence and validation; format helpers; shape adapters; view-config integrity (slots reference valid components, every slot's filters are supported).
- **Browser QA** on a throwaway mock-OTP stack seeded with ~90 days of orders: the no-scroll check at the four viewports above, filter behaviour, "View all", pager, dark mode, empty state (new café), and one failing metric degrading a single card.

## 8. Cleanup

After the new screen replaces it, delete the old `AnalyticsPanel` (only the owner dashboard used it). Everything else stays: the `RepeatCustomerBar`, `ItemMarginTable` and `KitchenSpeedPanel` molecules are also used by the super-admin heatmap panel, and `GET /analytics/dashboard` keeps its full payload (the KPI grid and plan-usage settings read it, and `backend/tests/demo.test.ts` asserts `dailySales` and `topProducts`). `computeItemMargins` and friends stay for super-admin insights.

## 9. Decisions to confirm in review

1. Headline sales = **net of GST**; "total collected" is a separate KPI/toggle.
2. Revenue counts **paid, non-cancelled** orders only; unpaid served orders surface as "money not collected".
3. Item filters (category, veg) work on **Overview and Menu only**; Customers takes only range + compare.
4. Margin is an **estimate**, per-item, only where a recipe exists.
5. Phone view is a **swipe pager**; "View all" is a **modal**.
6. Filters persist in **localStorage**, not the URL.
7. Auto-refresh every 60 s when the range includes today.

## 10. Risks

- Item-level filters change the meaning of order-level numbers; mitigated by the explicit semantics above and per-metric `notApplied`.
- A strict no-scroll grid can be cramped at 1366×768 with dense views; mitigated by density modes, the per-view slot budget above, and the acceptance check.
- Customer metrics group by stored phone string; legacy numbers with different formatting would count as separate customers (same limitation as the existing stat).

## 11. Planning notes (decisions made while building the first working version)

These refine the sections above; where they differ, these win.

- **Hourly detail** is allowed only for ranges of 14 days or less (a 400 otherwise); automatic granularity never picks it beyond 2 days.
- **Comparison covers the same elapsed time.** A range still in progress (today, last 7 days) is compared with an equally long slice of the earlier period (today at 10:30 against yesterday up to 10:30), so a half-finished day is never judged against a whole one. A series lays the previous period over the current one bucket by bucket.
- **Series points can be `null`:** a bucket that has not started yet, or one with nothing to take a median of. Charts draw a gap, never a zero.
- **Revenue KPIs carry a sparkline** (shown when the card is wide enough).
- **Customer rows never carry the phone number**, not even as an id: ids are positions (`customer-1`), and the number appears only masked (`90••••••01`).
- **Local midnight** is computed by a new `dateKeyToInstant` that re-reads the timezone offset, because the older `utils/timezone.startOfLocalDay` is an hour out on a day that contains a daylight-saving change (India has none, so it is unaffected today).
- **Column labels are short** (`Sales`, `Sold`, `Share`, `Margin`, `Trend`, `Value`) so headers stay on one line; the margin note says it is an estimate.
- **Money chart** is orders placed as bars with cancellations as a line on its own axis (`barLine`); the phone's first page holds the headline numbers plus the view's first chart.
- **Kitchen percentiles** use the newest 20,000 orders at most and say so (`sampled`).
- **Performance** was measured on 100,000 orders in an in-memory Mongo: a whole view takes 11–660 ms for today / 7 / 30 days and at most about 1.4 s for a full year (Kitchen), so no new index and no rollup tables.
- **Known, left alone:** the older `GET /analytics/dashboard` counts unpaid and cancelled orders in its `topProducts`; nothing displays that field any more.
