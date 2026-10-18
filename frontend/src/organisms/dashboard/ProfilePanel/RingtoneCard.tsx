import { useRef } from 'react';
import { Bell, Play, Upload, RotateCcw } from 'lucide-react';
import { AccountProfileState } from '@/hooks/useAccountProfile';
import { MAX_RINGTONE_SECONDS, playOrderSound } from '@/utils/orderSound';

/** The sound that plays on this person's screen when an order arrives — every role can pick their own. */
export const RingtoneCard = ({ account }: { account: AccountProfileState }) => {
  const { profile, busy } = account;
  const fileInput = useRef<HTMLInputElement>(null);
  if (!profile) return null;

  const custom = !!profile.ringtoneUrl;
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (file) account.uploadRingtone(file);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-900">New-order sound</h3>
          <p className="text-xs text-slate-500 font-semibold">
            {custom ? 'Your own sound' : 'Default sound'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => playOrderSound(profile.ringtoneUrl)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all"
        >
          <Play className="w-3.5 h-3.5" /> Play
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy === 'ringtone'}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-40 transition-all"
        >
          <Upload className="w-3.5 h-3.5" /> {busy === 'ringtone' ? 'Saving…' : 'Choose a sound'}
        </button>
        {custom && (
          <button
            type="button"
            onClick={account.removeRingtone}
            disabled={busy === 'ringtone'}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-500 hover:text-rose-600 font-bold text-xs disabled:opacity-40 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Use the default
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <p className="text-[11px] text-slate-400">
        MP3, WAV, OGG or M4A, up to 1MB and {MAX_RINGTONE_SECONDS} seconds. Plays on this account
        when an order arrives. Your browser needs the page open, and may stay silent until you have
        clicked something on it.
      </p>
    </div>
  );
};
