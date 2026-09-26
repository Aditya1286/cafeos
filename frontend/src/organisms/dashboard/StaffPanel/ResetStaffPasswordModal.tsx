import React, { useState } from 'react';
import { Modal } from '@/molecules/Modal';
import { FormField, inputCls } from '@/molecules/FormField';
import { StaffMember } from '@/services/dashboard/staff/types';
import { StaffState } from '@/hooks/useStaff';

const MIN_PASSWORD_LENGTH = 8; // mirrors backend/src/utils/password.ts

/** Staff can't reset their own password — the owner sets a new one here and shares it. */
export const ResetStaffPasswordModal = ({
  staffState,
  member,
  onClose,
}: {
  staffState: StaffState;
  member: StaffMember;
  onClose: () => void;
}) => {
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await staffState.resetStaffPassword(member.id, password)) onClose();
  };

  return (
    <Modal title={`New password for ${member.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label={`New password (min ${MIN_PASSWORD_LENGTH} characters)`}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            autoComplete="new-password"
            autoFocus
          />
        </FormField>
        <p className="text-[11px] text-slate-400">
          They'll be logged out everywhere and need this password to log back in.
        </p>
        <button
          type="submit"
          disabled={password.length < MIN_PASSWORD_LENGTH || staffState.saving}
          className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-40 transition-all"
        >
          {staffState.saving ? 'Saving…' : 'Set New Password'}
        </button>
      </form>
    </Modal>
  );
};
