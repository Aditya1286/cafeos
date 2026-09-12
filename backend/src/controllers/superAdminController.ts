import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { FinancialLedger } from '../models/FinancialLedger';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Subscription } from '../models/Subscription';

export const getSuperAdminOverview = async (req: AuthRequest, res: Response) => {
  try {
    const totalRestaurants = await Restaurant.countDocuments();
    const activeRestaurants = await Restaurant.countDocuments({ status: 'ACTIVE' });
    const suspendedRestaurants = await Restaurant.countDocuments({ status: 'SUSPENDED' });

    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();

    // Financial Ledger Metrics
    const gmvAggregation = await FinancialLedger.aggregate([
      { $match: { type: 'ORDER_PAYMENT', status: 'SUCCESS' } },
      { $group: { _id: null, totalGMVPaise: { $sum: '$amountPaise' } } }
    ]);
    const totalGMVPaise = gmvAggregation[0]?.totalGMVPaise || 0;

    const platformFeeAggregation = await FinancialLedger.aggregate([
      { $match: { type: 'PLATFORM_FEE', status: 'SUCCESS' } },
      { $group: { _id: null, totalPlatformFeesPaise: { $sum: '$amountPaise' } } }
    ]);
    const totalPlatformFeesPaise = platformFeeAggregation[0]?.totalPlatformFeesPaise || 0;

    const subscriptionRevenueAggregation = await FinancialLedger.aggregate([
      { $match: { type: 'SUBSCRIPTION_FEE', status: 'SUCCESS' } },
      { $group: { _id: null, totalSubscriptionRevenuePaise: { $sum: '$amountPaise' } } }
    ]);
    const totalSubscriptionRevenuePaise = subscriptionRevenueAggregation[0]?.totalSubscriptionRevenuePaise || 0;

    const totalPlatformRevenuePaise = totalPlatformFeesPaise + totalSubscriptionRevenuePaise;

    // Average Order Value (AOV)
    const avgOrderValuePaise = totalOrders > 0 ? Math.round(totalGMVPaise / totalOrders) : 0;

    // Fetch recent 10 orders with restaurant info
    const recentOrdersRaw = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('tenantId', 'name slug')
      .lean();

    const recentOrders = recentOrdersRaw.map((o: any) => ({
      _id: o._id.toString(),
      orderNumber: o.orderNumber,
      cafeName: o.tenantId?.name || 'Artisan Roastery',
      tableName: o.tableName,
      customerName: o.customerName,
      itemsCount: o.items?.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) || 1,
      total: Math.round((o.totalAmountPaise || 0) / 100),
      status: o.orderStatus,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt
    }));

    // Plans list
    const plans = await SubscriptionPlan.find();

    return res.json({
      success: true,
      data: {
        metrics: {
          totalRestaurants,
          activeRestaurants,
          suspendedRestaurants,
          totalUsers,
          totalOrders,
          totalGMVPaise,
          totalPlatformFeesPaise,
          totalSubscriptionRevenuePaise,
          totalPlatformRevenuePaise,
          avgOrderValuePaise
        },
        recentOrders,
        plans
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getAllRestaurants = async (req: AuthRequest, res: Response) => {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: restaurants });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const toggleRestaurantStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE' | 'SUSPENDED'

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Restaurant not found' } });

    restaurant.status = status;
    await restaurant.save();

    return res.json({
      success: true,
      message: `Restaurant status updated to ${status}`,
      data: restaurant
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const createSubscriptionPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, description, monthlyPricePaise, annualPricePaise, perOrderFeePaise, limits, isPopular } = req.body;

    const plan = await SubscriptionPlan.create({
      name,
      code,
      description,
      monthlyPricePaise: monthlyPricePaise || 0,
      annualPricePaise: annualPricePaise || 0,
      perOrderFeePaise: perOrderFeePaise || 200,
      limits: limits || {},
      isPopular: isPopular || false
    });

    return res.status(201).json({ success: true, data: plan, message: 'Subscription Plan created' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateSubscriptionPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findByIdAndUpdate(id, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } });
    return res.json({ success: true, data: plan, message: 'Subscription Plan updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getSystemHealth = async (req: AuthRequest, res: Response) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return res.json({
      success: true,
      data: {
        status: 'HEALTHY',
        uptimeSeconds: Math.floor(uptime),
        memoryUsage: {
          heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024)
        },
        database: 'CONNECTED',
        timestamp: new Date()
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
