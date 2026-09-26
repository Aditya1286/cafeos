import mongoose from 'mongoose';
import { SmepayAccount, ISmepayAccount } from '../models/SmepayAccount';

// Pure data-access layer for SmepayAccount — no validation or business rules here, that lives
// in ../services/checkoutSettings.service.ts and ../services/checkout.service.ts.

type Id = mongoose.Types.ObjectId | string;

export const findAccountByBusinessId = (businessId: Id): Promise<ISmepayAccount | null> =>
  SmepayAccount.findOne({ businessId });

// Includes the (select:false) encrypted client secret — only for making SMEPay calls.
export const findAccountWithSecret = (businessId: Id): Promise<ISmepayAccount | null> =>
  SmepayAccount.findOne({ businessId }).select('+clientSecretEnc');

export const findAccountsByBusinessIds = (businessIds: Id[]): Promise<ISmepayAccount[]> =>
  SmepayAccount.find({ businessId: { $in: businessIds } }).lean() as unknown as Promise<ISmepayAccount[]>;

export const upsertAccount = (businessId: Id, update: Partial<ISmepayAccount>): Promise<ISmepayAccount | null> =>
  SmepayAccount.findOneAndUpdate({ businessId }, { $set: update }, { upsert: true, new: true, setDefaultsOnInsert: true });
