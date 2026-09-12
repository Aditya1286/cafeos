import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { InventoryItem } from '../models/InventoryItem';
import { Table } from '../models/Table';

export const getOwnerAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId;

    const totalOrders = await Order.countDocuments({ businessId });
    const completedOrders = await Order.countDocuments({ businessId, orderStatus: 'COMPLETED' });
    const pendingOrders = await Order.countDocuments({ businessId, orderStatus: { $in: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'] } });

    // Sales metrics
    const salesAggregation = await Order.aggregate([
      { $match: { businessId, paymentStatus: 'PAID' } },
      { $group: { _id: null, totalSalesPaise: { $sum: '$totalAmountPaise' }, totalEarningsPaise: { $sum: '$businessEarningsPaise' } } }
    ]);

    const totalSalesPaise = salesAggregation[0]?.totalSalesPaise || 0;
    const totalEarningsPaise = salesAggregation[0]?.totalEarningsPaise || 0;

    // Active tables & low stock alerts
    const totalTables = await Table.countDocuments({ businessId });
    const occupiedTables = await Table.countDocuments({ businessId, status: 'OCCUPIED' });
    const lowStockItems = await InventoryItem.countDocuments({ businessId, status: { $in: ['LOW_STOCK', 'OUT_OF_STOCK'] } });

    // Daily Sales chart data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailySales = await Order.aggregate([
      { $match: { businessId, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          salesPaise: { $sum: '$totalAmountPaise' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top selling items
    const topProducts = await Order.aggregate([
      { $match: { businessId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenuePaise: { $sum: '$items.itemTotalPaise' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    return res.json({
      success: true,
      data: {
        metrics: {
          totalOrders,
          completedOrders,
          pendingOrders,
          totalSalesPaise,
          totalEarningsPaise,
          totalTables,
          occupiedTables,
          lowStockItems
        },
        dailySales,
        topProducts
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
