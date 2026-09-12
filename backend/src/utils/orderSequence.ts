import mongoose from 'mongoose';
import { DailyOrderCounter } from '../models/DailyOrderCounter';
import { Restaurant } from '../models/Restaurant';

/**
 * Generates an atomic, concurrency-safe daily order ID per café + date in local timezone.
 * Format: {CAFE_CODE}-{DDMMYY}-{SEQUENCE_PADDED}
 * Example: ART-120926-0001
 */
export const generateDailyOrderId = async (tenantId: mongoose.Types.ObjectId | string) => {
  // 1. Fetch restaurant for shortCode and timezone
  const restaurant = await Restaurant.findById(tenantId);
  const timezone = restaurant?.timezone || 'Asia/Kolkata';
  
  // Generate short code (e.g., "The Artisan Roastery" -> "ART" or slug "artisan-cafe" -> "ART")
  let shortCode = restaurant?.shortCode;
  if (!shortCode) {
    if (restaurant?.name) {
      const parts = restaurant.name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
      if (parts.length >= 3) {
        shortCode = (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
      } else if (parts.length === 2) {
        shortCode = (parts[0][0] + parts[1].substring(0, 2)).toUpperCase();
      } else {
        shortCode = parts[0].substring(0, 3).toUpperCase();
      }
    } else {
      shortCode = 'CAF';
    }
  }

  // 2. Calculate local date in YYYY-MM-DD and DDMMYY
  const now = new Date();
  // Format to local date string e.g. "2026-09-12"
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  const formatter = new Intl.DateTimeFormat('en-CA', dateOptions); // "YYYY-MM-DD"
  const dateKey = formatter.format(now); // e.g. "2026-09-12"

  // DDMMYY formatting
  const dateParts = dateKey.split('-'); // ["2026", "09", "12"]
  const yearShort = dateParts[0].substring(2);
  const ddmmyy = `${dateParts[2]}${dateParts[1]}${yearShort}`; // "120926"

  // 3. Concurrency-safe atomic increment using MongoDB findOneAndUpdate with upsert
  let counter;
  try {
    counter = await DailyOrderCounter.findOneAndUpdate(
      { tenantId: new mongoose.Types.ObjectId(tenantId.toString()), dateKey },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
  } catch (err: any) {
    // Retry once if duplicate key race condition occurs during simultaneous upsert
    if (err.code === 11000) {
      counter = await DailyOrderCounter.findOneAndUpdate(
        { tenantId: new mongoose.Types.ObjectId(tenantId.toString()), dateKey },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
      );
    } else {
      throw err;
    }
  }

  const sequenceNum = counter.sequence;
  // Pad sequence to at least 4 digits (e.g. 1 -> 0001, 12 -> 0012, 10000 -> 10000)
  const paddedSeq = sequenceNum < 10000 ? sequenceNum.toString().padStart(4, '0') : sequenceNum.toString();

  const formattedOrderId = `${shortCode}-${ddmmyy}-${paddedSeq}`;

  return {
    orderId: formattedOrderId,
    dateKey,
    sequenceNumber: sequenceNum,
    shortCode
  };
};
