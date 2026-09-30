import mongoose from 'mongoose';
import { DemoCafe } from './cafes';
import { localTime, minutesOf, MINUTE_MS } from './clock';
import { between, chance, pickWeighted, poisson, stableUnit } from './random';

// When customers turn up and what they order.

/**
 * Arrival times in [from, to), minute by minute: while the café is open, each minute gets a
 * Poisson-random number of orders whose mean follows the café's hourly curve, scaled so an average
 * day adds up to `ordersPerDay` (more at weekends, and a stable ±15% swing per date).
 */
export const arrivalsBetween = (cafe: DemoCafe, from: Date, to: Date): Date[] => {
  const open = minutesOf(cafe.profile.openingTime);
  const close = minutesOf(cafe.profile.closingTime);
  const weightOf = (minuteOfDay: number) => cafe.traffic.hourly[Math.floor(minuteOfDay / 60)] || 0;

  // The weighted number of open minutes in a day — what one day's orders are spread across.
  let dayWeight = 0;
  for (let m = open; m < close; m++) dayWeight += weightOf(m);
  if (dayWeight <= 0) return [];

  const arrivals: Date[] = [];
  const firstMinute = Math.ceil(from.getTime() / MINUTE_MS) * MINUTE_MS;
  for (let t = firstMinute; t < to.getTime(); t += MINUTE_MS) {
    const local = localTime(new Date(t));
    if (local.minuteOfDay < open || local.minuteOfDay >= close) continue;

    const weekend = local.weekday === 0 || local.weekday === 6;
    const dayOrders =
      cafe.traffic.ordersPerDay * (weekend ? cafe.traffic.weekendFactor : 1) * (0.85 + 0.3 * stableUnit(`${cafe.slug}|${local.dateKey}`));
    const count = poisson((dayOrders * weightOf(local.minuteOfDay)) / dayWeight);
    for (let i = 0; i < count; i++) {
      const at = t + Math.floor(Math.random() * MINUTE_MS);
      if (at < to.getTime()) arrivals.push(new Date(at));
    }
  }
  return arrivals.sort((a, b) => a.getTime() - b.getTime());
};

export interface MenuEntry {
  productId: mongoose.Types.ObjectId;
  name: string;
  pricePaise: number;
  categoryName: string;
  prepMinutes: number;
  weight: number;
}

export interface BasketLine {
  entry: MenuEntry;
  quantity: number;
}

/** One customer's order: 1–4 different items, drawn by popularity, sometimes two of one. */
export const buildBasket = (cafe: DemoCafe, menu: MenuEntry[]): BasketLine[] => {
  const size = Math.min(pickWeighted(cafe.traffic.basketSizes), menu.length);
  const remaining = [...menu];
  const lines: BasketLine[] = [];

  const take = (pool: MenuEntry[]) => {
    const entry = pickWeighted(pool.map((e) => [e, e.weight] as const));
    remaining.splice(remaining.indexOf(entry), 1);
    lines.push({ entry, quantity: chance(cafe.traffic.doubleChance) ? 2 : 1 });
  };

  const lead = cafe.traffic.leadCategories;
  if (lead && chance(lead.chance)) {
    const leadPool = remaining.filter((e) => lead.names.includes(e.categoryName));
    if (leadPool.length) take(leadPool);
  }
  while (lines.length < size && remaining.length) take(remaining);
  return lines;
};

// How long the kitchen takes on this basket, in minutes: its slowest item, give or take a busy pass.
export const kitchenMinutesFor = (lines: BasketLine[]) =>
  Math.max(...lines.map((l) => l.entry.prepMinutes)) * between(0.9, 1.4);

export type PaymentChoice = 'ONLINE' | 'CASH';
export const pickPaymentMethod = (cafe: DemoCafe): PaymentChoice => (chance(cafe.traffic.onlineShare) ? 'ONLINE' : 'CASH');

export type Outcome = 'COMPLETED' | 'CUSTOMER_CANCEL' | 'STAFF_CANCEL';
export const pickOutcome = (cafe: DemoCafe): Outcome => {
  const roll = Math.random();
  if (roll < cafe.traffic.customerCancelRate) return 'CUSTOMER_CANCEL';
  if (roll < cafe.traffic.customerCancelRate + cafe.traffic.staffCancelRate) return 'STAFF_CANCEL';
  return 'COMPLETED';
};
