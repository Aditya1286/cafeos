import { Business } from '../models/Business';
import { Order } from '../models/Order';
import { DEMO_CAFES } from './cafes';
import { DemoSimState } from './models/DemoSimState';
import { DemoOrderPlan } from './models/DemoOrderPlan';
import { ownerEmailOf, stateKeyOf } from './provision';
import { startOfLocalDay } from './clock';

// What the demo cafés look like right now — for GET /api/v1/demo/status and the CLI.
export const getDemoStatus = async (now: Date = new Date()) => {
  const todayStart = startOfLocalDay(now);
  return Promise.all(
    DEMO_CAFES.map(async (cafe) => {
      const business = await Business.findOne({ slug: cafe.slug });
      const base = { slug: cafe.slug, name: cafe.name, menuPath: `/c/${cafe.slug}`, ownerLogin: ownerEmailOf(cafe) };
      if (!business) return { ...base, exists: false };
      if (!business.isDemo) return { ...base, exists: true, isDemo: false, note: 'This slug belongs to a real business.' };

      const [state, today, activeOrders, pendingKitchenPlans, totalOrders] = await Promise.all([
        DemoSimState.findOne({ key: stateKeyOf(cafe) }),
        Order.aggregate([
          { $match: { businessId: business._id, createdAt: { $gte: todayStart, $lte: now } } },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              revenuePaise: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$totalAmountPaise', 0] } }
            }
          }
        ]),
        Order.countDocuments({ businessId: business._id, orderStatus: { $in: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'] } }),
        DemoOrderPlan.countDocuments({ businessId: business._id, done: false }),
        Order.countDocuments({ businessId: business._id })
      ]);

      return {
        ...base,
        exists: true,
        isDemo: true,
        simulatedUntil: state?.simulatedUntil || null,
        totalOrders,
        todayOrders: today[0]?.orders || 0,
        todayRevenuePaise: today[0]?.revenuePaise || 0,
        activeOrders,
        pendingKitchenPlans
      };
    })
  );
};
