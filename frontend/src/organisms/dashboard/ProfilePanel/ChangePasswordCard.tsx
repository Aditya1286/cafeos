import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { inputCls } from '@/molecules/FormField';
import { AccountProfileState } from '@/hooks/useAccountProfile';

const MIN_PASSWORD_LENGTH = 8; // mirrors backend/src/utils/password.ts

export const ChangePasswordCard = ({ account }: { account: AccountProfileState }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const problem =
    newPassword && newPassword.length < MIN_PASSWORD_LENGTH
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      : confirmPassword && confirmPassword !== newPassword
        ? "The two new passwords don't match."
        : null;
  const canSubmit =
    !!currentPassword &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    confirmPassword === newPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await account.changePassword({ currentPassword, newPassword })) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-3"
    >
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <KeyRound className="w-5 h-5 text-orange-500" />
        <h3 className="text-sm font-black text-slate-900">Change Password</h3>
      </div>
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Current password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        className={inputCls}
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className={inputCls}
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className={inputCls}
      />
      {problem && <p className="text-[11px] font-bold text-rose-600">{problem}</p>}
      <p className="text-[11px] text-slate-400">
        Other devices signed in to this account will be logged out.
      </p>
      <button
        type="submit"
        disabled={!canSubmit || account.busy === 'password'}
        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-40 transition-all"
      >
        {account.busy === 'password' ? 'Changing…' : 'Change Password'}
      </button>
    </form>
  );
};
