// Who is trying to log in. Accounts can be found by email or by phone number (owners: the
// business number; staff: the number their owner saved for them) — the password is the same
// either way. Everything after "which user is this" (status checks, token, cookie) stays in
// authController.login.
import { IUser } from '../models/User';
import * as userDao from '../dao/user.dao';
import { ServiceError } from '../utils/serviceError';
import { phoneKeyOf } from '../utils/phone';

const invalidCredentials = (method: 'email' | 'phone') =>
  new ServiceError(401, 'INVALID_CREDENTIALS', method === 'email' ? 'Invalid email or password.' : 'Invalid phone number or password.');

const loginByEmail = async (email: string, password: string): Promise<IUser> => {
  const user = await userDao.findUserByEmailWithPassword(email);
  if (!user || !(await user.comparePassword(password))) throw invalidCredentials('email');
  return user;
};

// A number can belong to more than one account (e.g. one owner running two cafés); the password
// picks between them. Only if it opens several at once is email needed to tell them apart.
const loginByPhone = async (phone: string, password: string): Promise<IUser> => {
  const phoneKey = phoneKeyOf(phone);
  if (!phoneKey) throw invalidCredentials('phone');

  const candidates = await userDao.findUsersByPhoneKeyWithPassword(phoneKey);
  const matches: IUser[] = [];
  for (const candidate of candidates) {
    if (await candidate.comparePassword(password)) matches.push(candidate);
  }

  if (matches.length === 0) throw invalidCredentials('phone');
  if (matches.length > 1) {
    throw new ServiceError(409, 'PHONE_AMBIGUOUS', 'This number is linked to more than one account. Please sign in with your email instead.');
  }
  return matches[0];
};

export const findUserForLogin = async (input: { email?: unknown; phone?: unknown; password?: unknown }): Promise<IUser> => {
  const password = typeof input.password === 'string' ? input.password : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';

  if (!password || (!email && !phone)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Enter your email or phone number, and your password.');
  }
  return email ? loginByEmail(email, password) : loginByPhone(phone, password);
};
