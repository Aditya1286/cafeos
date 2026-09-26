// A logged-in user managing their own account: profile, profile picture, password, and (owners
// only) their login email. Every rule for "who may change what" lives here.
//
// The business phone number is the source of truth for the owner's identity: changing the login
// email needs a fresh OTP to that number (otp.service's ACCOUNT verification).
import { Business } from '../models/Business';
import { IUser } from '../models/User';
import * as userDao from '../dao/user.dao';
import { ServiceError } from '../utils/serviceError';
import { assertValidNewPassword, hashPassword } from '../utils/password';
import { normalizeEmail } from '../utils/email';
import { maskPhone } from '../utils/phone';
import { signAuthToken } from '../utils/authToken';
import { uploadImage, deleteFile } from './storage';
import { isPhoneAccountVerified, consumeAccountVerification } from './otp.service';

const MAX_NAME_LENGTH = 80;

const toProfile = async (user: IUser) => {
  const business = user.businessId ? await Business.findById(user.businessId) : null;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || '',
    business: business
      ? {
          id: business._id,
          name: business.name,
          slug: business.slug,
          // The owner needs the full number to receive OTPs for account changes; staff don't.
          phone: user.role === 'OWNER' ? business.phone : undefined,
          phoneMasked: maskPhone(business.phone)
        }
      : null
  };
};

export type AccountProfile = Awaited<ReturnType<typeof toProfile>>;

const loadUser = async (userId: IUser['_id']) => {
  const user = await userDao.findUserById(userId);
  if (!user) throw new ServiceError(404, 'USER_NOT_FOUND', 'Account not found.');
  return user;
};

export const getProfile = async (userId: IUser['_id']) => toProfile(await loadUser(userId));

export const updateProfile = async (userId: IUser['_id'], input: { name?: unknown }) => {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > MAX_NAME_LENGTH) {
    throw new ServiceError(400, 'VALIDATION_ERROR', `Name is required (up to ${MAX_NAME_LENGTH} characters).`);
  }
  const user = await userDao.updateUser(userId, { name });
  if (!user) throw new ServiceError(404, 'USER_NOT_FOUND', 'Account not found.');
  return toProfile(user);
};

export const updateAvatar = async (userId: IUser['_id'], dataUrl: unknown) => {
  const user = await loadUser(userId);
  const { url } = await uploadImage({
    dataUrl,
    folder: 'avatars',
    ownerId: (user.businessId || user._id).toString()
  });
  const previous = user.avatarUrl;
  const updated = await userDao.updateUser(user._id, { avatarUrl: url });
  await deleteFile(previous);
  return toProfile(updated || user);
};

export const removeAvatar = async (userId: IUser['_id']) => {
  const user = await loadUser(userId);
  const previous = user.avatarUrl;
  const updated = await userDao.updateUser(user._id, { avatarUrl: '' });
  await deleteFile(previous);
  return toProfile(updated || user);
};

/**
 * Changes the user's own password. Every other session is logged out (their tokens predate the
 * change); this one continues with the fresh token returned here.
 */
export const changePassword = async (userId: IUser['_id'], input: { currentPassword?: unknown; newPassword?: unknown }) => {
  const newPassword = assertValidNewPassword(input.newPassword);
  const user = await userDao.findUserByIdWithPassword(userId);
  if (!user) throw new ServiceError(404, 'USER_NOT_FOUND', 'Account not found.');
  if (typeof input.currentPassword !== 'string' || !(await user.comparePassword(input.currentPassword))) {
    throw new ServiceError(400, 'WRONG_PASSWORD', 'Your current password is incorrect.');
  }

  const updated = await userDao.updateUser(user._id, {
    passwordHash: await hashPassword(newPassword),
    passwordChangedAt: new Date()
  });
  return { token: signAuthToken(updated || user) };
};

/**
 * Owner only: changes the owner's login email. Needs a fresh OTP to the business phone number
 * (verified through /public/otp/* with purpose ACCOUNT just before this call). Staff emails are
 * changed by the owner from staff management instead.
 */
export const changeOwnEmail = async (userId: IUser['_id'], input: { newEmail?: unknown }) => {
  const newEmail = normalizeEmail(input.newEmail);
  const user = await loadUser(userId);
  if (user.role !== 'OWNER' || !user.businessId) {
    throw new ServiceError(403, 'FORBIDDEN', 'Only the business owner can change their email here.');
  }
  if (newEmail === user.email) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'That is already your email address.');
  }
  if (await userDao.isEmailTaken(newEmail, user._id)) {
    throw new ServiceError(400, 'EMAIL_EXISTS', 'Another account already uses this email.');
  }

  const business = await Business.findById(user.businessId);
  if (!business?.phone || !(await isPhoneAccountVerified(business.phone))) {
    throw new ServiceError(400, 'PHONE_NOT_VERIFIED', 'Verify the OTP sent to your business phone number first.');
  }

  const updated = await userDao.updateUser(user._id, { email: newEmail });
  await consumeAccountVerification(business.phone);
  return toProfile(updated || user);
};
