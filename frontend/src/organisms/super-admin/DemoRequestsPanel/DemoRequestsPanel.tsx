import React, { useState } from 'react';
import { RefreshCw, Inbox, MessageCircle, Phone, StickyNote } from 'lucide-react';
import ResponsiveDataView, { ResponsiveColumn } from '@/molecules/ResponsiveDataView';
import { Modal } from '@/molecules/Modal';
import type {
  DemoRequest,
  DemoRequestStatus,
  UpdateDemoRequestPayload,
} from '@/services/superAdmin/demoRequests/types';

interface DemoRequestsPanelProps {
  requests: DemoRequest[];
  loading: boolean;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  onRefresh: () => void;
  onUpdate: (id: string, payload: UpdateDemoRequestPayload) => Promise<boolean>;
}

const STATUS_OPTIONS: { value: DemoRequestStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'TRIAL_STARTED', label: 'Trial started' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

const STATUS_STYLE: Record<DemoRequestStatus, string> = {
  NEW: 'bg-sky-50 text-sky-700 border-sky-200',
  CONTACTED: 'bg-amber-50 text-amber-700 border-amber-200',
  TRIAL_STARTED: 'bg-violet-50 text-violet-700 border-violet-200',
  WON: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOST: 'bg-slate-100 text-slate-500 border-slate-200',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const DemoRequestsPanel = ({
  requests,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  onUpdate,
}: DemoRequestsPanelProps) => {
  const [noteTarget, setNoteTarget] = useState<DemoRequest | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

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

  const renderStatusSelect = (r: DemoRequest) => (
    <select
      value={r.status}
      onChange={(e) => onUpdate(r.id, { status: e.target.value as DemoRequestStatus })}
      aria-label={`Status for ${r.brandName}`}
      className={`px-2.5 py-1.5 rounded-full text-[11px] font-black border outline-none cursor-pointer ${STATUS_STYLE[r.status]}`}
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const renderContactLinks = (r: DemoRequest) => (
    <div className="flex flex-wrap gap-1.5">
      <a
        href={`tel:+91${r.phone}`}
        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black flex items-center gap-1"
      >
        <Phone className="w-3.5 h-3.5" /> {r.phone}
      </a>
      <a
        href={`https://wa.me/91${r.phone}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-black flex items-center gap-1"
      >
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </a>
    </div>
  );

  const columns: ResponsiveColumn<DemoRequest>[] = [
    {
      header: 'Lead',
      render: (r) => (
        <>
          <div className="font-black text-slate-900">{r.brandName}</div>
          <div className="text-[11px] text-slate-500 font-semibold">
            {r.name} · {r.city}
            {r.businessType ? ` · ${r.businessType}` : ''}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">{formatDate(r.createdAt)}</div>
        </>
      ),
    },
    {
      header: 'Contact',
      render: (r) => (
        <div className="space-y-1.5">
          {renderContactLinks(r)}
          {r.email && <div className="text-[11px] text-slate-400 font-medium">{r.email}</div>}
        </div>
      ),
    },
    {
      header: 'Interest',
      render: (r) => (
        <>
          {r.interestedPlan && (
            <div className="text-[11px] font-black text-slate-700">Plan: {r.interestedPlan}</div>
          )}
          {r.message ? (
            <div
              className="text-[11px] text-slate-500 italic truncate max-w-[220px]"
              title={r.message}
            >
              "{r.message}"
            </div>
          ) : (
            !r.interestedPlan && <span className="text-[11px] text-slate-300">—</span>
          )}
        </>
      ),
    },
    {
      header: 'Status',
      render: (r) => renderStatusSelect(r),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
    {
      header: 'Note',
      align: 'right',
      render: (r) => (
        <button
          onClick={() => openNote(r)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black inline-flex items-center gap-1"
        >
          <StickyNote className="w-3.5 h-3.5" /> {r.adminNote ? 'Edit note' : 'Add note'}
        </button>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-brand-500" /> Demo Requests
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Everyone who asked for a demo or a free trial on the website. Call them while they're
            warm.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <label
          htmlFor="demo-status-filter"
          className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block"
        >
          Status
        </label>
        <select
          id="demo-status-filter"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-brand-500"
        >
          <option value="ALL">All requests</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading requests...</p>
          </div>
        ) : (
          <ResponsiveDataView
            data={requests}
            keyExtractor={(r) => r.id}
            columns={columns}
            renderCard={(r) => (
              <div className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 truncate">{r.brandName}</div>
                    <div className="text-[11px] text-slate-500 font-semibold">
                      {r.name} · {r.city}
                      {r.businessType ? ` · ${r.businessType}` : ''}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {formatDate(r.createdAt)}
                    </div>
                  </div>
                  {renderStatusSelect(r)}
                </div>
                {renderContactLinks(r)}
                {r.interestedPlan && (
                  <div className="text-[11px] font-black text-slate-700">
                    Plan: {r.interestedPlan}
                  </div>
                )}
                {r.message && (
                  <div className="text-xs text-slate-600 italic bg-slate-50 border border-slate-200 rounded-xl p-2">
                    "{r.message}"
                  </div>
                )}
                <button
                  onClick={() => openNote(r)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black flex items-center justify-center gap-1"
                >
                  <StickyNote className="w-3.5 h-3.5" /> {r.adminNote ? 'Edit note' : 'Add note'}
                </button>
              </div>
            )}
            search={{
              value: searchQuery,
              onChange: onSearchChange,
              placeholder: 'Search by name, café, phone or city...',
            }}
            pagination={{
              page: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onPageChange,
              onPageSizeChange,
              pageSizeOptions: [10, 15, 25, 50],
            }}
            emptyState={
              <div className="p-12 text-center space-y-3">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-black text-slate-800">No demo requests yet</h3>
                <p className="text-xs font-medium text-slate-500">
                  New requests from the website appear here. Try a different search or status if you
                  expected some.
                </p>
              </div>
            }
          />
        )}
      </div>

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
