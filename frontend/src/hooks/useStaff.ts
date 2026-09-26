import { useCallback, useEffect, useState } from 'react';
import staffService from '../services/dashboard/staff';
import {
  CreateStaffPayload,
  StaffList,
  StaffMember,
  UpdateStaffPayload,
} from '../services/dashboard/staff/types';
import { toast } from '../utils/toast';

/**
 * The owner's Staff tab: the business's staff logins plus the plan's active-staff limit. Fetches
 * only while `enabled` (the tab is visible). Every mutation resolves true on success so a modal
 * knows to close, and patches the list locally instead of re-fetching it.
 */
export const useStaff = (enabled: boolean) => {
  const [data, setData] = useState<StaffList | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffService.list();
      setData(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Could not load staff.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  const patchMember = (member: StaffMember) =>
    setData((prev) => {
      if (!prev) return prev;
      const staff = prev.staff.map((s) => (s.id === member.id ? member : s));
      return {
        ...prev,
        staff,
        limit: { ...prev.limit, active: staff.filter((s) => s.status === 'ACTIVE').length },
      };
    });

  // Shared shape of every mutation: busy flag, toast, true/false for the caller.
  const run = async (action: () => Promise<void>, success: string): Promise<boolean> => {
    setSaving(true);
    try {
      await action();
      toast.success(success);
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const createStaff = (payload: CreateStaffPayload) =>
    run(async () => {
      await staffService.create(payload);
      await refresh();
    }, `Staff account created for ${payload.name}.`);

  const updateStaff = (staffId: string, payload: UpdateStaffPayload) =>
    run(
      async () => patchMember((await staffService.update(staffId, payload)).data),
      'Staff details updated.',
    );

  const resetStaffPassword = (staffId: string, password: string) =>
    run(async () => {
      await staffService.resetPassword(staffId, password);
    }, 'Password reset — share the new one with them.');

  const setStaffStatus = (member: StaffMember, status: StaffMember['status']) =>
    run(
      async () => patchMember((await staffService.setStatus(member.id, status)).data),
      status === 'ACTIVE'
        ? `${member.name} can log in again.`
        : `${member.name} has been deactivated.`,
    );

  return {
    data,
    loading,
    saving,
    refresh,
    createStaff,
    updateStaff,
    resetStaffPassword,
    setStaffStatus,
  };
};

export type StaffState = ReturnType<typeof useStaff>;
