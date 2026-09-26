import mongoose from 'mongoose';
import { User, IUser, UserRole } from '../models/User';

// Pure data-access layer for User — no validation or business rules here, that lives in
// ../services/account.service.ts, passwordReset.service.ts and staff.service.ts.

type Id = mongoose.Types.ObjectId | string;

export const findUserById = (id: Id): Promise<IUser | null> => User.findById(id);

// Includes the (select:false) password hash — only for checking a password.
export const findUserByIdWithPassword = (id: Id): Promise<IUser | null> => User.findById(id).select('+passwordHash');

export const findUserByEmail = (email: string): Promise<IUser | null> => User.findOne({ email: email.toLowerCase().trim() });

export const findUserByEmailWithPassword = (email: string): Promise<IUser | null> =>
  User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

export const isEmailTaken = async (email: string, exceptUserId?: Id): Promise<boolean> =>
  !!(await User.exists({ email: email.toLowerCase().trim(), ...(exceptUserId ? { _id: { $ne: exceptUserId } } : {}) }));

export const createUser = (data: Partial<IUser>): Promise<IUser> => User.create(data);

export const updateUser = (id: Id, update: Partial<IUser>): Promise<IUser | null> =>
  User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });

export const listUsersByRole = (businessId: Id, role: UserRole): Promise<IUser[]> =>
  User.find({ businessId, role }).sort({ createdAt: -1 });

export const countActiveUsersByRole = (businessId: Id, role: UserRole): Promise<number> =>
  User.countDocuments({ businessId, role, status: 'ACTIVE' });

export const findBusinessUser = (businessId: Id, userId: Id, role: UserRole): Promise<IUser | null> =>
  mongoose.Types.ObjectId.isValid(userId) ? User.findOne({ _id: userId, businessId, role }) : Promise.resolve(null);

// A handful at most — phone login resolves the right account by password among them.
export const findUsersByPhoneKeyWithPassword = (phoneKey: string, limit = 5): Promise<IUser[]> =>
  User.find({ phoneKey }).select('+passwordHash').limit(limit);

export const isPhoneKeyTaken = async (phoneKey: string, exceptUserId?: Id): Promise<boolean> =>
  !!(await User.exists({ phoneKey, ...(exceptUserId ? { _id: { $ne: exceptUserId } } : {}) }));
