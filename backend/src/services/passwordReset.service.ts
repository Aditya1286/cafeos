// "Forgot password" for business owners. The business phone number is the source of truth:
//
//   1. verifyResetDetails — the owner types their login email AND the business phone. We only
//      go on if the pair matches, so this never reveals which number is on file (and an OTP is
//      never sent to a number that isn't the business's).
//   2. The browser runs the normal OTP flow (/public/otp/*) with purpose ACCOUNT on that number.
//   3. resetPassword — allowed only while that fresh ACCOUNT verification is live; it's consumed,
//      and every existing login for the account is invalidated.
//
// Staff accounts can't reset themselves; their owner sets a new password (staff.service).
import { Business } from '../models/Business';
import * as userDao from '../dao/user.dao';
import { ServiceError } from '../utils/serviceError';
import { assertValidNewPassword, hashPassword } from '../utils/password';
import { isSamePhone } from '../utils/phone';
import { isPhoneAccountVerified, consumeAccountVerification } from './otp.service';

const detailsMismatch = () =>
  new ServiceError(400, 'RESET_DETAILS_MISMATCH', "We couldn't find an owner account with that email and business phone number.");

// The one lookup both steps share. Every failure gives the same answer, so the endpoint can't be
// used to find out whether an email exists, or which kind of account it belongs to.
const findOwnerByEmailAndPhone = async (email: unknown, phone: unknown) => {
  if (typeof email !== 'string' || typeof phone !== 'string' || !email.trim() || !phone.trim()) {
    throw detailsMismatch();
  }
  const user = await userDao.findUserByEmail(email);
  if (!user || user.role !== 'OWNER' || user.status !== 'ACTIVE' || !user.businessId) throw detailsMismatch();

  const business = await Business.findById(user.businessId);
  if (!business || !isSamePhone(business.phone, phone)) throw detailsMismatch();

  return { user, businessPhone: business.phone };
};

export const verifyResetDetails = async (input: { email?: unknown; phone?: unknown }) => {
  await findOwnerByEmailAndPhone(input.email, input.phone);
  return { ok: true };
};

export const resetPassword = async (input: { email?: unknown; phone?: unknown; newPassword?: unknown }) => {
  const newPassword = assertValidNewPassword(input.newPassword);
  const { user, businessPhone } = await findOwnerByEmailAndPhone(input.email, input.phone);

  if (!(await isPhoneAccountVerified(businessPhone))) {
    throw new ServiceError(400, 'PHONE_NOT_VERIFIED', 'Verify the OTP sent to your business phone number first.');
  }

  await userDao.updateUser(user._id, {
    passwordHash: await hashPassword(newPassword),
    passwordChangedAt: new Date()
  });
  await consumeAccountVerification(businessPhone);
  return { ok: true };
};
