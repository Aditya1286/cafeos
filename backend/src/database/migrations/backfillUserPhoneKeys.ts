import { User } from '../../models/User';
import { Business } from '../../models/Business';
import { phoneKeyOf } from '../../utils/phone';

/**
 * Fills User.phoneKey for accounts created before phone login existed, so they can sign in with
 * their number. Idempotent and cheap once done (it only touches users still missing the key):
 * runs on every boot. Owners get their business phone — the number that's the source of truth
 * for an owner account — falling back to their personal one; everyone else their own phone.
 */
export const backfillUserPhoneKeys = async (): Promise<number> => {
  const users = await User.find({ phoneKey: { $exists: false } }).select('phone role businessId');
  let updated = 0;

  for (const user of users) {
    const businessPhone =
      user.role === 'OWNER' && user.businessId ? (await Business.findById(user.businessId).select('phone'))?.phone : undefined;
    const phoneKey = phoneKeyOf(businessPhone) || phoneKeyOf(user.phone);
    if (phoneKey) {
      await User.updateOne({ _id: user._id }, { $set: { phoneKey } });
      updated++;
    }
  }
  return updated;
};
