// An owner managing their business's staff logins. A STAFF user belongs to exactly one business
// and only works orders (the Kitchen tab); everything else in the dashboard is owner-only.
//
// Staff are never deleted — orders keep references to whoever confirmed them — only deactivated,
// which blocks login and ends any open session immediately (middleware/auth checks status).
import mongoose from 'mongoose';
import { IUser } from '../models/User';
import { Subscription } from '../models/Subscription';
import * as userDao from '../dao/user.dao';
import { ServiceError } from '../utils/serviceError';
import { assertValidNewPassword, hashPassword } from '../utils/password';
import { normalizeEmail } from '../utils/email';
import { phoneKeyOf } from '../utils/phone';

type Id = mongoose.Types.ObjectId | string;

const MAX_NAME_LENGTH = 80;

const toStaffView = (user: IUser) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  status: user.status,
  avatarUrl: user.avatarUrl || '',
  createdAt: (user as any).createdAt
});

export type StaffView = ReturnType<typeof toStaffView>;

const cleanName = (name: unknown): string => {
  const value = typeof name === 'string' ? name.trim() : '';
  if (!value || value.length > MAX_NAME_LENGTH) {
    throw new ServiceError(400, 'VALIDATION_ERROR', `Name is required (up to ${MAX_NAME_LENGTH} characters).`);
  }
  return value;
};

const cleanPhone = (phone: unknown): string => {
  if (phone === undefined || phone === null || phone === '') return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 12) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Enter a valid phone number, or leave it empty.');
  }
  return String(phone).trim();
};

// A staff member can sign in with their number, so it must lead to exactly one account.
const assertPhoneAvailable = async (phone: string, exceptUserId?: Id) => {
  const key = phoneKeyOf(phone);
  if (key && (await userDao.isPhoneKeyTaken(key, exceptUserId))) {
    throw new ServiceError(400, 'PHONE_IN_USE', 'This phone number is already used by another account.');
  }
};

// How many ACTIVE staff the business's plan allows (SubscriptionPlan.limits.maxStaff), or null
// when there's no plan to enforce.
const staffLimitFor = async (businessId: Id): Promise<number | null> => {
  const subscription = await Subscription.findOne({ businessId }).populate('planId');
  const maxStaff = (subscription?.planId as any)?.limits?.maxStaff;
  return typeof maxStaff === 'number' ? maxStaff : null;
};

const assertRoomForActiveStaff = async (businessId: Id) => {
  const limit = await staffLimitFor(businessId);
  if (limit !== null && (await userDao.countActiveUsersByRole(businessId, 'STAFF')) >= limit) {
    throw new ServiceError(
      403,
      'STAFF_LIMIT_REACHED',
      `Your plan allows ${limit} active staff account${limit === 1 ? '' : 's'}. Deactivate one or upgrade your plan.`
    );
  }
};

const loadStaff = async (businessId: Id, staffId: Id) => {
  const staff = await userDao.findBusinessUser(businessId, staffId, 'STAFF');
  if (!staff) throw new ServiceError(404, 'STAFF_NOT_FOUND', 'Staff member not found.');
  return staff;
};

export const listStaff = async (businessId: Id) => {
  const [staff, limit] = await Promise.all([userDao.listUsersByRole(businessId, 'STAFF'), staffLimitFor(businessId)]);
  return {
    staff: staff.map(toStaffView),
    limit: { maxActive: limit, active: staff.filter((s) => s.status === 'ACTIVE').length }
  };
};

export const createStaff = async (
  businessId: Id,
  input: { name?: unknown; email?: unknown; password?: unknown; phone?: unknown }
) => {
  const name = cleanName(input.name);
  const email = normalizeEmail(input.email);
  const password = assertValidNewPassword(input.password);
  const phone = cleanPhone(input.phone);

  if (await userDao.isEmailTaken(email)) {
    throw new ServiceError(400, 'EMAIL_EXISTS', 'Another account already uses this email.');
  }
  await assertPhoneAvailable(phone);
  await assertRoomForActiveStaff(businessId);

  const staff = await userDao.createUser({
    name,
    email,
    phone,
    passwordHash: await hashPassword(password),
    role: 'STAFF',
    businessId: new mongoose.Types.ObjectId(String(businessId)),
    status: 'ACTIVE'
  });
  return toStaffView(staff);
};

/** Owner edits a staff member's details — including their login email or number, no OTP needed. */
export const updateStaff = async (
  businessId: Id,
  staffId: Id,
  input: { name?: unknown; email?: unknown; phone?: unknown }
) => {
  const staff = await loadStaff(businessId, staffId);
  const update: Partial<IUser> = {};

  if (input.name !== undefined) update.name = cleanName(input.name);
  if (input.phone !== undefined) {
    update.phone = cleanPhone(input.phone);
    await assertPhoneAvailable(update.phone, staff._id);
    update.phoneKey = phoneKeyOf(update.phone); // an update query skips the model's save hook
  }
  if (input.email !== undefined) {
    const email = normalizeEmail(input.email);
    if (email !== staff.email && (await userDao.isEmailTaken(email, staff._id))) {
      throw new ServiceError(400, 'EMAIL_EXISTS', 'Another account already uses this email.');
    }
    update.email = email;
  }

  return toStaffView((await userDao.updateUser(staff._id, update)) || staff);
};

/** Owner sets a new password for a staff member; any session they had open is logged out. */
export const resetStaffPassword = async (businessId: Id, staffId: Id, password: unknown) => {
  const newPassword = assertValidNewPassword(password);
  const staff = await loadStaff(businessId, staffId);
  await userDao.updateUser(staff._id, { passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() });
  return { ok: true };
};

export const setStaffStatus = async (businessId: Id, staffId: Id, status: unknown) => {
  if (status !== 'ACTIVE' && status !== 'INACTIVE') {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'status must be ACTIVE or INACTIVE.');
  }
  const staff = await loadStaff(businessId, staffId);
  if (status === 'ACTIVE' && staff.status !== 'ACTIVE') {
    await assertRoomForActiveStaff(businessId);
  }
  return toStaffView((await userDao.updateUser(staff._id, { status })) || staff);
};
