import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Table } from '../models/Table';
import { Restaurant } from '../models/Restaurant';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

// Public: Resolve QR code token to Cafe & Table info
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

    const restaurant = await Restaurant.findById(table.tenantId);
    if (!restaurant || restaurant.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: { code: 'RESTAURANT_INACTIVE', message: 'This restaurant is currently inactive.' }
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
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          slug: restaurant.slug,
          logoUrl: restaurant.logoUrl,
          coverImageUrl: restaurant.coverImageUrl,
          currencySymbol: restaurant.currencySymbol,
          taxRatePercentage: restaurant.taxRatePercentage
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
    const tables = await Table.find({ tenantId: req.tenantId }).sort({ tableNumber: 1 });
    return res.json({ success: true, data: tables });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Create table
export const createTable = async (req: AuthRequest, res: Response) => {
  try {
    const { tableNumber, capacity } = req.body;
    const qrToken = `qr_${req.tenantId?.toString().slice(-6)}_${uuidv4().substring(0, 8)}`;

    const table = await Table.create({
      tenantId: req.tenantId,
      tableNumber,
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
    const table = await Table.findOne({ _id: id, tenantId: req.tenantId });
    if (!table) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found' } });

    const restaurant = await Restaurant.findById(req.tenantId);
    const targetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/c/${restaurant?.slug}/t/${table.qrToken}`;

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

export const deleteTable = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await Table.findOneAndDelete({ _id: id, tenantId: req.tenantId });
    return res.json({ success: true, message: 'Table deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
