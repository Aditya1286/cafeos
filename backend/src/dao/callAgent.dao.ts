import { User, IUser } from '../models/User';

// Pure data-access layer for the SUPER_ADMIN call-availability roster.

export const findAvailableAgents = (): Promise<IUser[]> =>
  // $ne: false (not a strict `true` match) so a SUPER_ADMIN document that predates this field
  // — Mongoose schema defaults never retroactively populate existing rows — still counts as
  // available, matching the "everyone starts free" default the field is meant to express.
  User.find({ role: 'SUPER_ADMIN', status: 'ACTIVE', isAvailableForCalls: { $ne: false }, phone: { $exists: true, $ne: '' } });

export const listAgents = (): Promise<IUser[]> =>
  User.find({ role: 'SUPER_ADMIN', status: 'ACTIVE' }).sort({ name: 1 });

export const setAgentAvailability = (userId: string, isAvailable: boolean): Promise<IUser | null> =>
  User.findOneAndUpdate({ _id: userId, role: 'SUPER_ADMIN' }, { isAvailableForCalls: isAvailable }, { new: true });
