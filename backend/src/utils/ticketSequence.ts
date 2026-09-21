import mongoose from 'mongoose';
import { DailyTicketCounter } from '../models/DailyTicketCounter';
import { Business } from '../models/Business';

/**
 * Generates an atomic, concurrency-safe daily support-ticket ID per business + date in local
 * timezone. Mirrors orderSequence.ts's generateDailyOrderId, backed by its own counter
 * collection so ticket numbers never collide with order numbers.
 * Format: SUP-{BIZ_CODE}-{DDMMYY}-{SEQUENCE_PADDED}
 * Example: SUP-ART-120926-0001
 */
export const generateDailyTicketId = async (businessId: mongoose.Types.ObjectId | string) => {
  const business = await Business.findById(businessId);
  const timezone = business?.timezone || 'Asia/Kolkata';

  let shortCode = business?.shortCode;
  if (!shortCode) {
    if (business?.name) {
      const parts = business.name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
      if (parts.length >= 3) {
        shortCode = (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
      } else if (parts.length === 2) {
        shortCode = (parts[0][0] + parts[1].substring(0, 2)).toUpperCase();
      } else {
        shortCode = parts[0].substring(0, 3).toUpperCase();
      }
    } else {
      shortCode = 'BIZ';
    }
  }

  const now = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };

  const formatter = new Intl.DateTimeFormat('en-CA', dateOptions); // "YYYY-MM-DD"
  const dateKey = formatter.format(now);

  const dateParts = dateKey.split('-'); // ["2026", "09", "12"]
  const yearShort = dateParts[0].substring(2);
  const ddmmyy = `${dateParts[2]}${dateParts[1]}${yearShort}`; // "120926"

  let counter;
  try {
    counter = await DailyTicketCounter.findOneAndUpdate(
      { businessId: new mongoose.Types.ObjectId(businessId.toString()), dateKey },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
  } catch (err: any) {
    if (err.code === 11000) {
      counter = await DailyTicketCounter.findOneAndUpdate(
        { businessId: new mongoose.Types.ObjectId(businessId.toString()), dateKey },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
      );
    } else {
      throw err;
    }
  }

  const sequenceNum = counter.sequence;
  const paddedSeq = sequenceNum < 10000 ? sequenceNum.toString().padStart(4, '0') : sequenceNum.toString();

  return `SUP-${shortCode}-${ddmmyy}-${paddedSeq}`;
};
