import React, { useEffect, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { inputCls } from '@/molecules/FormField';
import { AccountProfileState } from '@/hooks/useAccountProfile';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  STAFF: 'Kitchen staff',
  MANAGER: 'Manager',
  SUPER_ADMIN: 'Platform admin',
};

/** Picture + name — the two profile details every role can change. */
export const AvatarCard = ({ account }: { account: AccountProfileState }) => {
  const { profile, busy } = account;
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (profile) setName(profile.name);
  }, [profile?.name]);

  if (!profile) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (file) account.uploadAvatar(file);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="w-20 h-20 rounded-2xl object-cover border border-slate-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-2xl flex items-center justify-center">
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy === 'avatar'}
            className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-slate-900 text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
            aria-label="Change profile picture"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-black text-slate-900 truncate">{profile.name}</h2>
          <p className="text-xs text-slate-500 font-semibold truncate">{profile.email}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-black">
              {ROLE_LABELS[profile.role] || profile.role}
            </span>
            {profile.business && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black">
                {profile.business.name}
              </span>
            )}
          </div>
          {profile.avatarUrl && (
            <button
              type="button"
              onClick={account.removeAvatar}
              disabled={busy === 'avatar'}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" /> Remove picture
            </button>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 space-y-2">
        <label className="text-[10px] font-extrabold uppercase text-slate-400">Display name</label>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          <button
            type="button"
            onClick={() => account.saveName(name.trim())}
            disabled={busy === 'name' || !name.trim() || name.trim() === profile.name}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-40 transition-all shrink-0"
          >
            {busy === 'name' ? 'Saving…' : 'Save'}
          </button>
        </div>
        <p className="text-[11px] text-slate-400">JPEG, PNG or WEBP picture, up to 5MB.</p>
      </div>
    </div>
  );
};
