import { useCallback, useEffect, useState } from 'react';
import accountService from '../services/account';
import { AccountProfile, ChangePasswordPayload } from '../services/account/types';
import { setAuthToken } from '../services/api';
import { readFileAsDataUrl } from '../utils/readFileAsDataUrl';
import { MAX_RINGTONE_BYTES, MAX_RINGTONE_SECONDS, readAudioSeconds } from '../utils/orderSound';
import { toast } from '../utils/toast';

/**
 * The logged-in user's own profile (Profile tab, every role): name, picture, password, and — for
 * owners — their login email. Fetches only while `enabled`. Mutations resolve true on success.
 */
export const useAccountProfile = (enabled: boolean) => {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'name' | 'avatar' | 'ringtone' | 'password' | 'email' | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accountService.getProfile();
      setProfile(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && !profile) refresh();
  }, [enabled, profile, refresh]);

  const run = async (
    kind: NonNullable<typeof busy>,
    action: () => Promise<void>,
    success: string,
  ): Promise<boolean> => {
    setBusy(kind);
    try {
      await action();
      toast.success(success);
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveName = (name: string) =>
    run(
      'name',
      async () => setProfile((await accountService.updateProfile(name)).data),
      'Name updated.',
    );

  const uploadAvatar = (file: File) =>
    run(
      'avatar',
      async () =>
        setProfile((await accountService.uploadAvatar(await readFileAsDataUrl(file))).data),
      'Profile picture updated.',
    );

  const removeAvatar = () =>
    run(
      'avatar',
      async () => setProfile((await accountService.removeAvatar()).data),
      'Profile picture removed.',
    );

  const uploadRingtone = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('Please pick an audio file (MP3, WAV, OGG or M4A).');
      return false;
    }
    if (file.size > MAX_RINGTONE_BYTES) {
      toast.error('That sound is over 1MB. A few seconds is plenty.');
      return false;
    }
    const seconds = await readAudioSeconds(file);
    if (seconds === null) {
      toast.error('Your browser could not play that file. Try an MP3.');
      return false;
    }
    if (seconds > MAX_RINGTONE_SECONDS) {
      toast.error(
        `That sound is ${Math.round(seconds)} seconds long. Keep it under ${MAX_RINGTONE_SECONDS}.`,
      );
      return false;
    }
    return run(
      'ringtone',
      async () =>
        setProfile((await accountService.uploadRingtone(await readFileAsDataUrl(file))).data),
      'New-order sound updated.',
    );
  };

  const removeRingtone = () =>
    run(
      'ringtone',
      async () => setProfile((await accountService.removeRingtone()).data),
      'New-order sound reset to the default.',
    );

  // Every other session is logged out by the change; keep this one going with the fresh token.
  const changePassword = (payload: ChangePasswordPayload) =>
    run(
      'password',
      async () => setAuthToken((await accountService.changePassword(payload)).data.token),
      'Password changed. Other devices have been logged out.',
    );

  const changeEmail = (newEmail: string) =>
    run(
      'email',
      async () => setProfile((await accountService.changeEmail(newEmail)).data),
      'Login email changed.',
    );

  return {
    profile,
    loading,
    busy,
    refresh,
    saveName,
    uploadAvatar,
    removeAvatar,
    uploadRingtone,
    removeRingtone,
    changePassword,
    changeEmail,
  };
};

export type AccountProfileState = ReturnType<typeof useAccountProfile>;
