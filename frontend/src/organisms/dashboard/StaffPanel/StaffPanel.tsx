import { useState } from 'react';
import { KeyRound, Pencil, Plus, Power, Users } from 'lucide-react';
import { StaffMember } from '@/services/dashboard/staff/types';
import { StaffState } from '@/hooks/useStaff';
import { StaffFormModal } from './StaffFormModal';
import { ResetStaffPasswordModal } from './ResetStaffPasswordModal';

// Which dialog is open. Kept here rather than in the page: it's pure UI state for this panel,
// and every server change still goes through the useStaff hook passed in.
type OpenDialog =
  | { kind: 'create' }
  | { kind: 'edit'; member: StaffMember }
  | { kind: 'password'; member: StaffMember }
  | null;

const StaffRow = ({
  member,
  onEdit,
  onResetPassword,
  onToggleActive,
  saving,
}: {
  member: StaffMember;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggleActive: () => void;
  saving: boolean;
}) => {
  const active = member.status === 'ACTIVE';
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border ${active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-70'}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt=""
            className="w-10 h-10 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0">
            {member.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900 truncate">{member.name}</p>
          <p className="text-[11px] text-slate-500 font-semibold truncate">
            {member.email}
            {member.phone ? ` · ${member.phone}` : ''}
          </p>
        </div>
        <span
          className={`ml-auto sm:ml-0 px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${
            active
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          {active ? 'ACTIVE' : 'DEACTIVATED'}
        </span>
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-extrabold"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button
          onClick={onResetPassword}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-extrabold"
        >
          <KeyRound className="w-3 h-3" /> Password
        </button>
        <button
          onClick={onToggleActive}
          disabled={saving}
          className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-extrabold disabled:opacity-50 ${
            active
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
          }`}
        >
          <Power className="w-3 h-3" /> {active ? 'Deactivate' : 'Reactivate'}
        </button>
      </div>
    </div>
  );
};

/** Owner-only "Staff" tab: kitchen staff logins for this business. */
export const StaffPanel = ({ staffState }: { staffState: StaffState }) => {
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const { data, loading, saving } = staffState;
  const limit = data?.limit;
  const atLimit = !!limit && limit.maxActive !== null && limit.active >= limit.maxActive;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 border border-orange-200 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900">Kitchen Staff</h2>
            <p className="text-[11px] text-slate-500 font-semibold">
              Staff log in to accept and work orders — they only see the Kitchen tab.
              {limit &&
                limit.maxActive !== null &&
                ` ${limit.active} of ${limit.maxActive} active accounts used on your plan.`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDialog({ kind: 'create' })}
          disabled={atLimit}
          title={
            atLimit
              ? 'Your plan’s staff limit is reached — deactivate someone or upgrade.'
              : undefined
          }
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs disabled:opacity-40 transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Add Staff
        </button>
      </div>

      {loading && !data ? (
        <div className="py-16 text-center text-xs text-slate-400 font-semibold">Loading staff…</div>
      ) : data && data.staff.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400 font-semibold">
          No staff yet. Add your first kitchen login above.
        </div>
      ) : (
        <div className="space-y-3">
          {data?.staff.map((member) => (
            <StaffRow
              key={member.id}
              member={member}
              saving={saving}
              onEdit={() => setDialog({ kind: 'edit', member })}
              onResetPassword={() => setDialog({ kind: 'password', member })}
              onToggleActive={() =>
                staffState.setStaffStatus(
                  member,
                  member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                )
              }
            />
          ))}
        </div>
      )}

      {dialog?.kind === 'create' && (
        <StaffFormModal staffState={staffState} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'edit' && (
        <StaffFormModal
          staffState={staffState}
          member={dialog.member}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'password' && (
        <ResetStaffPasswordModal
          staffState={staffState}
          member={dialog.member}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
};

export default StaffPanel;
