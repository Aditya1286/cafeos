import { AccountProfileState } from '@/hooks/useAccountProfile';
import { AvatarCard } from './AvatarCard';
import { ChangePasswordCard } from './ChangePasswordCard';
import { ChangeEmailCard } from './ChangeEmailCard';

/** "My Profile" tab — every role. The login-email card only renders for owners. */
export const ProfilePanel = ({ account }: { account: AccountProfileState }) => {
  if (!account.profile) {
    return (
      <div className="py-16 text-center text-xs text-slate-400 font-semibold">
        {account.loading ? 'Loading profile…' : 'Could not load your profile.'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <AvatarCard account={account} />
      <div className="space-y-6">
        <ChangePasswordCard account={account} />
        {account.profile.role === 'OWNER' && <ChangeEmailCard account={account} />}
      </div>
    </div>
  );
};

export default ProfilePanel;
