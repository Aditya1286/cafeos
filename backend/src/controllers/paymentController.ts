import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { FinancialLedger } from '../models/FinancialLedger';
import { Business } from '../models/Business';
import { v4 as uuidv4 } from 'uuid';

export const processPayment = async (req: Request, res: Response) => {
  try {
    const { orderId, paymentGatewayRef, idempotencyKey } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Order ID is required' }
      });
    }

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingLedger = await FinancialLedger.findOne({ idempotencyKey });
      if (existingLedger) {
        return res.json({
          success: true,
          message: 'Payment already processed (Idempotency Key Matched)',
          data: existingLedger
        });
      }
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
      });
    }

    if (order.paymentStatus === 'PAID') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_PAID', message: 'This order has already been paid.' }
      });
    }

    const business = await Business.findById(order.businessId);
    const platformFeePaise = order.platformFeePaise || 200; // ₹2
    const totalAmountPaise = order.totalAmountPaise;
    const businessEarningsPaise = totalAmountPaise - platformFeePaise;

    // 2. Double-Entry Immutable Ledger Creation
    const gatewayRef = paymentGatewayRef || `pay_mock_${uuidv4().substring(0, 10)}`;

    // Ledger 1: ORDER_PAYMENT (Gross Payment)
    const ledgerOrderPayment = await FinancialLedger.create({
      transactionId: `TXN_PAY_${uuidv4().substring(0, 10).toUpperCase()}`,
      businessId: order.businessId,
      orderId: order._id,
      type: 'ORDER_PAYMENT',
      amountPaise: totalAmountPaise,
      currency: 'INR',
      status: 'SUCCESS',
      paymentGatewayRef: gatewayRef,
      idempotencyKey,
      metadata: { orderNumber: order.orderNumber, customerName: order.customerName }
    });

    // Ledger 2: PLATFORM_FEE (SaaS Platform Commission Fee)
    await FinancialLedger.create({
      transactionId: `TXN_FEE_${uuidv4().substring(0, 10).toUpperCase()}`,
      businessId: order.businessId,
      orderId: order._id,
      type: 'PLATFORM_FEE',
      amountPaise: platformFeePaise,
      currency: 'INR',
      status: 'SUCCESS',
      paymentGatewayRef: gatewayRef,
      metadata: { orderNumber: order.orderNumber, feeRate: '₹2 per order' }
    });

    // Ledger 3: BUSINESS_SETTLEMENT (Net Payout to Business)
    await FinancialLedger.create({
      transactionId: `TXN_SETTLE_${uuidv4().substring(0, 10).toUpperCase()}`,
      businessId: order.businessId,
      orderId: order._id,
      type: 'BUSINESS_SETTLEMENT',
      amountPaise: businessEarningsPaise,
      currency: 'INR',
      status: 'SUCCESS',
      paymentGatewayRef: gatewayRef,
      metadata: { orderNumber: order.orderNumber, businessName: business?.name }
    });

    // Update order status
    order.paymentStatus = 'PAID';
    if (order.orderStatus === 'PLACED') {
      order.orderStatus = 'CONFIRMED';
    }
    await order.save();

    return res.json({
      success: true,
      message: 'Payment processed and ledger recorded successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmountPaise,
        platformFeePaise,
        businessEarningsPaise,
        transactionId: ledgerOrderPayment.transactionId
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getLedgerTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await FinancialLedger.find({ businessId: req.businessId })
      .populate('orderId')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: transactions });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
