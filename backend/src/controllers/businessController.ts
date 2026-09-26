import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Business } from '../models/Business';
import { isAcceptableGstRate, GST_RATE_ERROR_MESSAGE } from '../utils/gst';

// Owner: Update their own business's self-service settings — the UPI VPA used
// for the customer-facing payment QR/intent link, whether this business uses
// physical tables at all (a kirana/general store can turn tables off entirely
// and take unlimited counter orders), whether their master QR (the general
// menu link) still takes counter orders while tables are on, and their GST/tax rate — one of the
// restaurant GST slabs in utils/gst.ts (0 = no tax charged on new orders, the
// current platform-wide default).
export const updateBusinessSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { upiVpa, tablesEnabled, masterQrEnabled, taxRatePercentage } = req.body;

    const business = await Business.findById(req.businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        error: { code: 'BUSINESS_NOT_FOUND', message: 'Business not found.' }
      });
    }

    if (upiVpa !== undefined) {
      business.upiVpa = String(upiVpa).trim();
    }

    if (tablesEnabled !== undefined) {
      business.tablesEnabled = Boolean(tablesEnabled);
    }

    if (masterQrEnabled !== undefined) {
      if (typeof masterQrEnabled !== 'boolean') {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'masterQrEnabled must be true or false.' } });
      }
      business.masterQrEnabled = masterQrEnabled;
    }

    if (taxRatePercentage !== undefined) {
      if (!isAcceptableGstRate(taxRatePercentage, business.taxRatePercentage)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: GST_RATE_ERROR_MESSAGE }
        });
      }
      business.taxRatePercentage = taxRatePercentage;
    }

    await business.save();

    return res.json({
      success: true,
      message: 'Business settings updated successfully',
      data: {
        id: business._id,
        upiVpa: business.upiVpa,
        tablesEnabled: business.tablesEnabled,
        masterQrEnabled: business.masterQrEnabled,
        taxRatePercentage: business.taxRatePercentage
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
