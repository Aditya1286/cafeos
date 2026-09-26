import React, { useState } from 'react';
import { Modal } from '@/molecules/Modal';
import { FormField, inputCls } from '@/molecules/FormField';
import { StaffMember } from '@/services/dashboard/staff/types';
import { StaffState } from '@/hooks/useStaff';

const MIN_PASSWORD_LENGTH = 8; // mirrors backend/src/utils/password.ts

interface StaffFormModalProps {
  staffState: StaffState;
  /** Edit this member; omit to create a new one. */
  member?: StaffMember;
  onClose: () => void;
}

/** Create a staff login, or edit one's details (the owner can change their email directly). */
export const StaffFormModal = ({ staffState, member, onClose }: StaffFormModalProps) => {
  const editing = !!member;
  const [name, setName] = useState(member?.name || '');
  const [email, setEmail] = useState(member?.email || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [password, setPassword] = useState('');

  const passwordOk = editing || password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit = !!name.trim() && !!email.trim() && passwordOk && !staffState.saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const details = { name: name.trim(), email: email.trim(), phone: phone.trim() };
    const ok = editing
      ? await staffState.updateStaff(member!.id, details)
      : await staffState.createStaff({ ...details, password });
    if (ok) onClose();
  };

  return (
    <Modal title={editing ? `Edit ${member!.name}` : 'Add Kitchen Staff'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            autoFocus
          />
        </FormField>
        <FormField label="Login email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="off"
          />
        </FormField>
        <FormField label="Phone (optional — they can also sign in with it)">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
          />
        </FormField>
        {!editing && (
          <FormField label={`Password (min ${MIN_PASSWORD_LENGTH} characters)`}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              autoComplete="new-password"
            />
          </FormField>
        )}
        {!editing && (
          <p className="text-[11px] text-slate-400">
            Share the email (or phone) and password with them. They'll only see the Kitchen tab and
            their own profile.
          </p>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-40 transition-all"
        >
          {staffState.saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Staff Account'}
        </button>
      </form>
    </Modal>
  );
};
