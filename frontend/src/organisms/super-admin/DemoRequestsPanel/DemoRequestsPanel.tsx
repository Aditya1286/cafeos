import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox, PartyPopper, RefreshCw, Search } from 'lucide-react';
import { Modal } from '@/molecules/Modal';
import type {
  DemoRequest,
  DemoRequestStatus,
  DemoRequestStatusCounts,
  UpdateDemoRequestPayload,
} from '@/services/superAdmin/demoRequests/types';
import type { DemoLeadUrgency } from '@/constants/demoFunnel';
import { hoursSince, timeAgo, urgencyOf } from '@/utils/demoLeads';
import { LeadCard, STATUS_LABEL } from './LeadCard';

interface DemoRequestsPanelProps {
  requests: DemoRequest[];
  loading: boolean;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  statusCounts: DemoRequestStatusCounts;
  onRefresh: () => void;
  onUpdate: (id: string, payload: UpdateDemoRequestPayload) => Promise<boolean>;
}

const PIPELINE: DemoRequestStatus[] = ['NEW', 'CONTACTED', 'TRIAL_STARTED', 'WON', 'LOST'];

const EMPTY_TEXT: Record<string, string> = {
  CONTACTED: 'Nobody here yet. Leads you have called move here.',
  TRIAL_STARTED: 'No trials running yet.',
  WON: 'No paying cafés from the website yet.',
  LOST: 'Nobody marked as not interested.',
  ALL: 'No demo requests yet. They arrive here the moment someone finishes the quiz on the website.',
};

const URGENCY_RANK: Record<DemoLeadUrgency, number> = { hot: 0, warm: 1, later: 2, cold: 3 };

/**
 * The website's leads as a call list. The NEW tab is the to-do: hottest first (wants it this
 * week), then whoever has waited longest. Each card is a call brief with the next step on it.
 */
export const DemoRequestsPanel = ({
  requests,
  loading,
  pagination,
  onPageChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  onRefresh,
  onUpdate,
}: DemoRequestsPanelProps) => {
  const [noteTarget, setNoteTarget] = useState<DemoRequest | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const total = PIPELINE.reduce((n, s) => n + statusCounts[s], 0);
  const onNewTab = statusFilter === 'NEW';

  const ordered = useMemo(() => {
    if (!onNewTab) return requests;
    const rank = (r: DemoRequest) => {
      const u = urgencyOf(r.answers);
      return u ? URGENCY_RANK[u] : 2;
    };
    return [...requests].sort(
      (a, b) =>
        rank(a) - rank(b) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [requests, onNewTab]);

  // The line under the title: what needs doing right now.
  const summary = (() => {
    const waiting = statusCounts.NEW;
    if (waiting === 0) return 'Nobody is waiting for a call. Nice.';
    const hot = onNewTab ? requests.filter((r) => urgencyOf(r.answers) === 'hot').length : 0;
    const oldest = onNewTab
      ? requests.reduce<DemoRequest | null>(
          (o, r) => (!o || r.createdAt < o.createdAt ? r : o),
          null,
        )
      : null;
    const parts = [`${waiting} café${waiting === 1 ? ' is' : 's are'} waiting for a call`];
    if (hot > 0) parts.push(`${hot} want${hot === 1 ? 's' : ''} it this week`);
    if (oldest && hoursSince(oldest.createdAt) >= 1)
      parts.push(`the oldest has waited ${timeAgo(oldest.createdAt)}`);
    return `${parts.join(', ')}.`;
  })();

  const openNote = (r: DemoRequest) => {
    setNoteTarget(r);
    setNoteText(r.adminNote || '');
  };

  const saveNote = async () => {
    if (!noteTarget) return;
    setSavingNote(true);
    const ok = await onUpdate(noteTarget.id, { adminNote: noteText });
    setSavingNote(false);
    if (ok) setNoteTarget(null);
  };

  const tabs: Array<{ id: string; label: string; count: number }> = [
    ...PIPELINE.map((s) => ({ id: s, label: STATUS_LABEL[s], count: statusCounts[s] })),
    { id: 'ALL', label: 'All', count: total },
  ];

  const firstShown = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastShown = Math.min(pagination.total, pagination.page * pagination.limit);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-brand-500" /> Demo requests
          </h2>
          <p
            className={`text-sm font-bold mt-1 ${statusCounts.NEW > 0 ? 'text-slate-800' : 'text-emerald-600'}`}
          >
            {summary}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Call, then tap the next step on the card. Hottest leads are at the top of New.
          </p>
        </div>
        <button
          onClick={onRefresh}
          aria-label="Refresh"
          className="shrink-0 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 lg:flex-1">
          {tabs.map((t) => {
            const active = statusFilter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onStatusFilterChange(t.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border transition-all ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t.label}
                <span
                  className={`min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                    active
                      ? 'bg-white/20 text-white'
                      : t.id === 'NEW' && t.count > 0
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
        <label className="relative lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search café, name, phone or city"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      {loading && requests.length === 0 ? (
        <div className="p-12 text-center">
          <RefreshCw className="w-7 h-7 text-brand-500 animate-spin mx-auto" />
        </div>
      ) : ordered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
          {onNewTab && !searchQuery ? (
            <>
              <PartyPopper className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-black text-slate-800">All caught up</h3>
              <p className="text-xs font-medium text-slate-500">
                Every lead has been called. New ones land here and in your email.
              </p>
              {total > 0 && (
                <button
                  onClick={() => onStatusFilterChange('ALL')}
                  className="text-xs font-black text-brand-600 hover:underline"
                >
                  See all {total} leads
                </button>
              )}
            </>
          ) : (
            <>
              <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-500">
                {searchQuery ? `Nothing matches “${searchQuery}”.` : EMPTY_TEXT[statusFilter]}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {ordered.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onUpdate={onUpdate} onEditNote={openNote} />
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>
            {firstShown}–{lastShown} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="p-2 rounded-xl bg-white border border-slate-200 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="p-2 rounded-xl bg-white border border-slate-200 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {noteTarget && (
        <Modal
          title={`Note for ${noteTarget.brandName}`}
          onClose={() => setNoteTarget(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={5}
              maxLength={2000}
              autoFocus
              placeholder="e.g. Called, wants a demo on Friday at 4pm."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setNoteTarget(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                disabled={savingNote}
                className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all disabled:opacity-50"
              >
                {savingNote ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DemoRequestsPanel;
