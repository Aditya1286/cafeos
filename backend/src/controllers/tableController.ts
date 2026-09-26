import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Table } from '../models/Table';
import { Business } from '../models/Business';
import { Order } from '../models/Order';
import { isCheckoutAvailable } from '../services/checkout.service';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

// Public: Resolve QR code token to Business & Table info
export const getTableByToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const table = await Table.findOne({ qrToken: token });

    if (!table) {
      return res.status(404).json({
        success: false,
        error: { code: 'TABLE_NOT_FOUND', message: 'Invalid or inactive table QR code token.' }
      });
    }

    if (!table.isActive) {
      return res.status(403).json({
        success: false,
        error: { code: 'TABLE_DISABLED', message: 'This table is temporarily unavailable. Please ask staff for assistance.' }
      });
    }

    const business = await Business.findById(table.businessId);
    if (!business || business.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: { code: 'BUSINESS_INACTIVE', message: 'This business is currently inactive.' }
      });
    }

    return res.json({
      success: true,
      data: {
        table: {
          id: table._id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          qrToken: table.qrToken
        },
        business: {
          id: business._id,
          name: business.name,
          slug: business.slug,
          logoUrl: business.logoUrl,
          coverImageUrl: business.coverImageUrl,
          currencySymbol: business.currencySymbol,
          taxRatePercentage: business.taxRatePercentage,
          checkoutAvailable: isCheckoutAvailable(business)
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: List tables
export const getTables = async (req: AuthRequest, res: Response) => {
  try {
    const tables = await Table.find({ businessId: req.businessId }).sort({ tableNumber: 1 });
    return res.json({ success: true, data: tables });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Create table
export const createTable = async (req: AuthRequest, res: Response) => {
  try {
    const { tableNumber, capacity } = req.body;

    if (!tableNumber || !String(tableNumber).trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Table number is required.' } });
    }

    const existing = await Table.findOne({ businessId: req.businessId, tableNumber: String(tableNumber).trim() });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE_TABLE', message: `Table "${tableNumber}" already exists.` } });
    }

    const qrToken = `qr_${req.businessId?.toString().slice(-6)}_${uuidv4().substring(0, 8)}`;

    const table = await Table.create({
      businessId: req.businessId,
      tableNumber: String(tableNumber).trim(),
      capacity: capacity || 4,
      qrToken,
      status: 'AVAILABLE'
    });

    return res.status(201).json({ success: true, data: table, message: 'Table created' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Generate QR Data URL for table
export const getTableQRCode = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const table = await Table.findOne({ _id: id, businessId: req.businessId });
    if (!table) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found' } });

    const business = await Business.findById(req.businessId);
    const targetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/c/${business?.slug}/t/${table.qrToken}`;

    const qrDataUrl = await qrcode.toDataURL(targetUrl, {
      margin: 2,
      width: 400,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });

    return res.json({
      success: true,
      data: {
        tableNumber: table.tableNumber,
        qrToken: table.qrToken,
        targetUrl,
        qrDataUrl
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Enable/disable a table's QR without deleting it — stops new orders
// from that QR while keeping the table row and its order history intact.
export const toggleTableActive = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const table = await Table.findOne({ _id: id, businessId: req.businessId });
    if (!table) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found' } });
    }

    table.isActive = !table.isActive;
    await table.save();

    return res.json({
      success: true,
      data: table,
      message: table.isActive ? 'Table enabled' : 'Table disabled'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Manually force a table back to AVAILABLE — an escape hatch for when the
// occupied indicator gets stuck (e.g. stale seed/import data) and doesn't reflect reality.
// Unlike deleteTable, this deliberately does not block on an active order: staff reaching
// for this button are correcting what they can see on the floor, not managing the order.
export const markTableEmpty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const table = await Table.findOne({ _id: id, businessId: req.businessId });
    if (!table) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found' } });
    }

    table.status = 'AVAILABLE';
    await table.save();

    return res.json({ success: true, data: table, message: 'Table marked as empty' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const deleteTable = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const table = await Table.findOne({ _id: id, businessId: req.businessId });
    if (!table) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found' } });
    }

    // Deleting out from under an in-progress order would orphan it — reject rather
    // than silently leave the order's tableId pointing at nothing.
    const activeOrder = await Order.findOne({
      tableId: table._id,
      orderStatus: { $nin: ['COMPLETED', 'CANCELLED', 'REFUNDED'] }
    });
    if (activeOrder) {
      return res.status(409).json({
        success: false,
        error: { code: 'TABLE_HAS_ACTIVE_ORDER', message: 'This table has an order in progress — complete or cancel it before deleting the table.' }
      });
    }

    await table.deleteOne();
    return res.json({ success: true, message: 'Table deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
