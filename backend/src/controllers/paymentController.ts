import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { FinancialLedger } from '../models/FinancialLedger';
import { Business } from '../models/Business';
import { Remittance } from '../models/Remittance';
import { getRemittanceSummary } from '../services/remittance.service';
import { config } from '../config';

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

// Business-facing view of what they owe the platform — same underlying data the super admin
// finance drawer shows, but read-only (only a super admin can confirm a remittance was received).
export const getMyRemittances = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.businessId) {
      return res.status(403).json({ success: false, error: { code: 'BUSINESS_REQUIRED', message: 'Business context is missing.' } });
    }

    const business = await Business.findById(req.businessId);
    const summary = await getRemittanceSummary(req.businessId);

    return res.json({
      success: true,
      data: {
        commissionRatePercentage: business?.commissionRatePercentage ?? 3,
        platformUpiVpa: config.platformUpiVpa,
        platformPayeeName: config.platformPayeeName,
        ...summary
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Business: self-report that they've paid their outstanding commission via the platform's UPI
// QR. There's no gateway webhook here either (same limitation as the customer-payment flow) —
// this never flips a remittance to PAID, it just timestamps the claim (and an optional UTR) so
// a super admin knows to check the bank statement and confirm it themselves.
export const markRemittanceClaimedPaid = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.businessId) {
      return res.status(403).json({ success: false, error: { code: 'BUSINESS_REQUIRED', message: 'Business context is missing.' } });
    }

    const { utr } = req.body;
    const now = new Date();

    const result = await Remittance.updateMany(
      { businessId: req.businessId, status: 'UNPAID' },
      { $set: { merchantMarkedPaidAt: now, merchantReportedUtr: utr ? String(utr).trim() : '' } }
    );

    if (result.matchedCount === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NOTHING_OWED', message: 'There is nothing outstanding to mark as paid.' }
      });
    }

    return res.json({
      success: true,
      message: 'Thanks — we\'ll check the payment and update your account soon.',
      data: { periodsMarked: result.matchedCount, merchantMarkedPaidAt: now }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
