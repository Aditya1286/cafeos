import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Order } from '../models/Order';
import { FinancialLedger } from '../models/FinancialLedger';
import { DailyOrderCounter } from '../models/DailyOrderCounter';
import { CafeContext } from './provision';
import { localTime, MINUTE_MS } from './clock';
import { between, chance } from './random';
import { pickCustomer } from './customers';
import { buildBasket, kitchenMinutesFor, pickOutcome, pickPaymentMethod } from './demand';
import { priceBasket } from './pricing';

// Past orders for a demo café: what the café "did" before the simulation reached the present. They
// are written straight to the database (thousands at once, with their real past timestamps), in the
// same shape the live code leaves them in — a completed order as placeOrder + the staff status
// updates leave it, with the two ledger rows recordOrderPaymentLedger writes; a cancelled order
// unpaid with no ledger rows.

// Mirrors generateDailyOrderId (utils/orderSequence.ts): the same atomic per-business-per-day
// counter, but for a past day and a whole block of numbers at once.
const reserveOrderNumbers = async (businessId: mongoose.Types.ObjectId, dateKey: string, count: number): Promise<number> => {
  const filter = { businessId, dateKey };
  const bump = () => DailyOrderCounter.findOneAndUpdate(filter, { $inc: { sequence: count } }, { new: true, upsert: true });
  try {
    return (await bump()).sequence - count + 1;
  } catch (err: any) {
    if (err.code === 11000) return (await bump()).sequence - count + 1;
    throw err;
  }
};

const orderNumberOf = (shortCode: string, ddmmyy: string, sequence: number) =>
  `${shortCode}-${ddmmyy}-${sequence < 10000 ? String(sequence).padStart(4, '0') : sequence}`;

const minutesAfter = (at: Date, minutes: number) => new Date(at.getTime() + minutes * MINUTE_MS);

/** Writes one café's orders for `arrivals` — all within one Bangalore calendar day — and returns how many. */
export const writeHistory = async (ctx: CafeContext, arrivals: Date[], now: Date): Promise<number> => {
  if (!arrivals.length || !ctx.menu.length) return 0;
  const { cafe, business, kitchenUser, tables } = ctx;
  const { dateKey, ddmmyy } = localTime(arrivals[0]);
  const firstSequence = await reserveOrderNumbers(business._id, dateKey, arrivals.length);
  // Never later than a minute ago, however slow the kitchen was.
  const latest = now.getTime() - MINUTE_MS;
  const clamp = (at: Date) => new Date(Math.min(at.getTime(), latest));

  const orders: any[] = [];
  const ledger: any[] = [];

  arrivals.forEach((placedAt, i) => {
    const sequenceNumber = firstSequence + i;
    const orderId = orderNumberOf(business.shortCode || cafe.shortCode, ddmmyy, sequenceNumber);
    const customer = pickCustomer(cafe);
    const lines = buildBasket(cafe, ctx.menu);
    const pricing = priceBasket(business, lines);
    const paymentMethod = pickPaymentMethod(cafe);
    const table = tables.length && chance(cafe.traffic.tableShare) ? tables[Math.floor(Math.random() * tables.length)] : null;
    const outcome = pickOutcome(cafe);
    const _id = new mongoose.Types.ObjectId();

    const order: any = {
      _id,
      orderId,
      orderNumber: orderId,
      businessId: business._id,
      dateKey,
      sequenceNumber,
      tableId: table ? table._id : undefined,
      tableName: table ? table.tableNumber : 'Counter',
      customerName: customer.name,
      customerPhone: customer.phone,
      source: table ? 'QR_TABLE' : 'TAKEAWAY',
      ...pricing,
      paymentMethod,
      transactionId: '',
      notes: '',
      createdAt: placedAt
    };

    if (outcome === 'COMPLETED') {
      const acceptedAt = clamp(minutesAfter(placedAt, between(0.5, 3)));
      const preparingAt = clamp(minutesAfter(acceptedAt, between(0.5, 2)));
      const readyAt = clamp(minutesAfter(preparingAt, kitchenMinutesFor(lines)));
      const completedAt = clamp(minutesAfter(readyAt, table ? between(5, 15) : between(1, 5)));
      Object.assign(order, {
        orderStatus: 'COMPLETED',
        paymentStatus: 'PAID',
        timeline: { placedAt, acceptedAt, preparingAt, readyAt, completedAt },
        updatedAt: completedAt
      });
      // Most UPI payers tap "I've paid" on their tracking page while they wait.
      if (paymentMethod === 'ONLINE' && chance(0.7)) {
        order.customerMarkedPaidAt = clamp(minutesAfter(readyAt, -between(0, 2)));
      }
      // As recordOrderPaymentLedger writes them, dated when the order was completed (paid).
      const gatewayRef = `order_${orderId}`;
      ledger.push(
        {
          transactionId: `TXN_PAY_${uuidv4().substring(0, 10).toUpperCase()}`,
          businessId: business._id,
          orderId: _id,
          type: 'ORDER_PAYMENT',
          amountPaise: pricing.totalAmountPaise,
          currency: 'INR',
          status: 'SUCCESS',
          paymentGatewayRef: gatewayRef,
          metadata: { orderNumber: orderId, customerName: customer.name },
          createdAt: completedAt,
          updatedAt: completedAt
        },
        {
          transactionId: `TXN_FEE_${uuidv4().substring(0, 10).toUpperCase()}`,
          businessId: business._id,
          orderId: _id,
          type: 'PLATFORM_FEE',
          amountPaise: pricing.platformFeePaise,
          currency: 'INR',
          status: 'SUCCESS',
          paymentGatewayRef: gatewayRef,
          metadata: { orderNumber: orderId, commissionRate: '3%' },
          createdAt: completedAt,
          updatedAt: completedAt
        }
      );
    } else {
      // Only a new order can be cancelled, so it's cancelled within minutes and never paid.
      const cancelledAt = clamp(minutesAfter(placedAt, between(0.5, 4)));
      Object.assign(order, {
        orderStatus: 'CANCELLED',
        paymentStatus: 'UNPAID',
        timeline: { placedAt, cancelledAt },
        updatedAt: cancelledAt,
        ...(outcome === 'CUSTOMER_CANCEL'
          ? { cancellationReason: 'Cancelled by customer before payment confirmation' }
          : { cancelledByUserId: kitchenUser._id })
      });
    }
    orders.push(order);
  });

  await Order.insertMany(orders);
  if (ledger.length) await FinancialLedger.insertMany(ledger);
  return orders.length;
};
