import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import superAdminIdentityService from '@/services/superAdmin/identity';
import type {
  AdminIdentityPayload,
  CafeIdentitySummaryRow,
  IdentityEventKind,
} from '@/services/superAdmin/identity/types';
import type { StoredBusinessIdentity } from '@/types';
import { IdentitySection } from '../BusinessManagementModal/IdentitySection';

// Super admin readout for café identity (spec §11): per café, the 30-day return rate in the 60 days
// before identity was switched on and since, when the theme was adopted, and the last 30 days of
// engagement events. A plain table on purpose.

const EVENT_COLUMNS: { kind: IdentityEventKind; label: string }[] = [
  { kind: 'welcome_shown', label: 'Welcome' },
  { kind: 'welcome_usual_added', label: 'Usual added' },
  { kind: 'tip_shown', label: 'Tips' },
  { kind: 'pairing_shown', label: 'Pairing shown' },
  { kind: 'pairing_added', label: 'Pairing added' },
  { kind: 'pairing_ordered', label: 'Pairing ordered' },
  { kind: 'question_shown', label: 'Question' },
  { kind: 'question_answered', label: 'Answered' },
  { kind: 'not_you_clicked', label: 'Not you' },
];

const pct = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);
const date = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

interface CafeIdentityPanelProps {
  /** Every café, from the dashboard's business list (each carries its stored `identity`). */
  businesses?: { _id: string; name: string; slug: string; identity?: StoredBusinessIdentity }[];
  savingIdentityId?: string | null;
  /** Switch a café on/off or set its theme. Resolves true when saved. */
  onSetIdentity?: (businessId: string, payload: AdminIdentityPayload) => Promise<boolean>;
}

/** Super admin's home for café identity: switch each café on and give it a theme, then see the
 * readout below. */
export function CafeIdentityPanel({
  businesses = [],
  savingIdentityId,
  onSetIdentity,
}: CafeIdentityPanelProps) {
  const [rows, setRows] = useState<CafeIdentitySummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminIdentityService.getSummary();
      setRows(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Could not load the café identity summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setIdentity = async (businessId: string, payload: AdminIdentityPayload) => {
    const ok = (await onSetIdentity?.(businessId, payload)) ?? false;
    if (ok) load();
    return ok;
  };

  return (
    <div className="space-y-6">
      {onSetIdentity && (
        <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <header className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-black text-slate-900">Switch cafés on</h2>
            <p className="text-[11px] font-semibold text-slate-500">
              Turn café identity on for a café and give it a theme. Once on, the owner can change
              the look in their Settings.
            </p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
            {businesses.map((b) => (
              <div key={b._id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-black text-slate-900 truncate">{b.name}</p>
                <p className="text-[11px] font-semibold text-slate-400 truncate">/c/{b.slug}</p>
                <IdentitySection
                  identity={b.identity}
                  saving={savingIdentityId === b._id}
                  onSet={(payload) => setIdentity(b._id, payload)}
                />
              </div>
            ))}
            {businesses.length === 0 && (
              <p className="text-xs font-semibold text-slate-400">No cafés yet.</p>
            )}
          </div>
        </section>
      )}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <div>
              <h2 className="text-sm font-black text-slate-900">Café Identity</h2>
              <p className="text-[11px] font-semibold text-slate-500">
                30-day return rate before (60 days) and after switching on · events in the last 30
                days
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black inline-flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </header>

        {error && (
          <div className="px-5 py-3 text-xs font-bold text-rose-700 bg-rose-50">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-black">Café</th>
                <th className="px-3 py-2.5 text-left font-black">Switched on</th>
                <th className="px-3 py-2.5 text-left font-black">Theme adopted</th>
                <th className="px-3 py-2.5 text-right font-black">Return before</th>
                <th className="px-3 py-2.5 text-right font-black">Return after</th>
                {EVENT_COLUMNS.map((c) => (
                  <th key={c.kind} className="px-3 py-2.5 text-right font-black whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.businessId} className="text-slate-700">
                  <td className="px-4 py-2.5 font-black text-slate-900 whitespace-nowrap">
                    {r.name}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{date(r.enabledAt)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{date(r.appliedAt)}</td>
                  <td className="px-3 py-2.5 text-right font-bold">{pct(r.returnRateBefore)}</td>
                  <td className="px-3 py-2.5 text-right font-black text-slate-900">
                    {pct(r.returnRateAfter)}
                  </td>
                  {EVENT_COLUMNS.map((c) => (
                    <td key={c.kind} className="px-3 py-2.5 text-right tabular-nums">
                      {r.events30d[c.kind] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && rows.length === 0 && !error && (
                <tr>
                  <td
                    colSpan={5 + EVENT_COLUMNS.length}
                    className="px-4 py-10 text-center text-slate-400 font-semibold"
                  >
                    No café has identity switched on yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default CafeIdentityPanel;
