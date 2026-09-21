import React, { useState } from 'react';
import { RefreshCw, LifeBuoy, UserCheck, TriangleAlert, CheckCircle2, PhoneCall, PhoneOff } from 'lucide-react';
import ResponsiveDataView, { ResponsiveColumn } from '../../ui/ResponsiveDataView';
import { Modal } from '../../molecules/Modal';

interface SupportTicketsPanelProps {
  currentUserId: string;
  tickets: any[];
  loading: boolean;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  onRefresh: () => void;
  onAssignToSelf: (ticketId: string) => void;
  onEscalate: (ticketId: string) => void;
  onResolve: (ticketId: string, note: string) => Promise<boolean>;
  agents: any[];
  loadingAgents: boolean;
  togglingAvailability: boolean;
  onToggleMyAvailability: () => void;
}

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-sky-50 text-sky-700 border-sky-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  ESCALATED: 'bg-rose-50 text-rose-700 border-rose-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-500 border-slate-200'
};

const PRIORITY_STYLE: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-500',
  MEDIUM: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-orange-50 text-orange-700',
  URGENT: 'bg-rose-100 text-rose-700'
};

export const SupportTicketsPanel = ({
  currentUserId, tickets, loading, pagination, onPageChange, onPageSizeChange,
  searchQuery, onSearchChange, statusFilter, onStatusFilterChange, onRefresh,
  onAssignToSelf, onEscalate, onResolve,
  agents, loadingAgents, togglingAvailability, onToggleMyAvailability
}: SupportTicketsPanelProps) => {
  const [ticketToResolve, setTicketToResolve] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const handleConfirmResolve = async () => {
    if (!ticketToResolve || !resolutionNote.trim()) return;
    setResolving(true);
    const ok = await onResolve(ticketToResolve._id, resolutionNote.trim());
    setResolving(false);
    if (ok) {
      setTicketToResolve(null);
      setResolutionNote('');
    }
  };

  const columns: ResponsiveColumn<any>[] = [
    {
      header: 'Ticket',
      render: (t) => (
        <>
          <div className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl inline-block mb-1">
            {t.ticketNumber}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap'
    },
    {
      header: 'Raised By',
      render: (t) => (
        <>
          <div className="font-black text-slate-900 truncate max-w-[160px]">{t.contactName}</div>
          <div className="text-[11px] text-slate-400 font-semibold">{t.contactPhone}</div>
          <span className="text-[9px] font-black uppercase text-slate-400">{t.raisedByType === 'BUSINESS_OWNER' ? 'Business Owner' : 'Customer'}</span>
        </>
      )
    },
    {
      header: 'Issue',
      render: (t) => (
        <>
          <div className="font-bold text-slate-800 text-xs">{t.category?.replace(/_/g, ' ')}</div>
          {t.subCategory && <div className="text-[11px] text-slate-400">{t.subCategory}</div>}
          <div className="text-[11px] text-slate-500 italic truncate max-w-[220px]" title={t.description}>"{t.description}"</div>
        </>
      )
    },
    {
      header: 'Status',
      render: (t) => (
        <div className="space-y-1">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border inline-block ${STATUS_STYLE[t.status] || STATUS_STYLE.OPEN}`}>
            ● {t.status.replace('_', ' ')}
          </span>
          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full inline-block ${PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.MEDIUM}`}>
            {t.priority}
          </span>
        </div>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap'
    },
    {
      header: 'Actions',
      align: 'right',
      render: (t) => (
        <div className="flex flex-wrap gap-1.5 justify-end">
          {t.status !== 'RESOLVED' && t.status !== 'CLOSED' && (
            <>
              {t.assignedToUserId?._id !== currentUserId && (
                <button
                  onClick={() => onAssignToSelf(t._id)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black transition-colors flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Assign to me
                </button>
              )}
              {t.status !== 'ESCALATED' && (
                <button
                  onClick={() => onEscalate(t._id)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-black transition-colors flex items-center gap-1"
                >
                  <TriangleAlert className="w-3.5 h-3.5" /> Escalate
                </button>
              )}
              <button
                onClick={() => setTicketToResolve(t)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black transition-colors flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
              </button>
            </>
          )}
        </div>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><LifeBuoy className="w-5 h-5 text-orange-500" /> Support Tickets</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Every consumer and business-owner issue, in one queue. Assign, escalate, and resolve — the business never sees this.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-3">Call Agents (SUPER_ADMIN)</span>
        {loadingAgents ? (
          <div className="text-xs text-slate-400 font-semibold">Loading agents…</div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {agents.map((a) => {
              const isMe = a.id === currentUserId;
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${
                    a.isAvailableForCalls ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  {a.isAvailableForCalls ? <PhoneCall className="w-3.5 h-3.5" /> : <PhoneOff className="w-3.5 h-3.5" />}
                  <span>{a.name}{isMe ? ' (you)' : ''}</span>
                  {isMe && (
                    <button
                      onClick={onToggleMyAvailability}
                      disabled={togglingAvailability}
                      className="ml-1 px-2 py-0.5 rounded-lg bg-white border border-current text-[10px] font-black disabled:opacity-50"
                    >
                      {a.isAvailableForCalls ? 'Go unavailable' : 'Go available'}
                    </button>
                  )}
                </div>
              );
            })}
            {agents.length === 0 && <span className="text-xs text-slate-400 font-medium">No SUPER_ADMIN agents found.</span>}
          </div>
        )}
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <label className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ESCALATED">Escalated</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading tickets...</p>
          </div>
        ) : (
          <ResponsiveDataView
            data={tickets}
            keyExtractor={(t) => t._id}
            columns={columns}
            renderCard={(t) => (
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl">{t.ticketNumber}</div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${STATUS_STYLE[t.status] || STATUS_STYLE.OPEN}`}>{t.status.replace('_', ' ')}</span>
                </div>
                <div className="font-black text-slate-900">{t.contactName} · {t.contactPhone}</div>
                <div className="text-xs text-slate-600 italic">"{t.description}"</div>
              </div>
            )}
            search={{ value: searchQuery, onChange: onSearchChange, placeholder: 'Search by ticket #, name, or phone...' }}
            pagination={{
              page: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onPageChange,
              onPageSizeChange,
              pageSizeOptions: [10, 15, 25, 50]
            }}
            emptyState={
              <div className="p-12 text-center space-y-3">
                <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-black text-slate-800">No support tickets found</h3>
                <p className="text-xs font-medium text-slate-500">Try adjusting your search or filter.</p>
              </div>
            }
          />
        )}
      </div>

      {ticketToResolve && (
        <Modal title={`Resolve ${ticketToResolve.ticketNumber}`} onClose={() => setTicketToResolve(null)} maxWidth="max-w-md">
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium">
              This note is what the customer will see when they check their ticket status.
            </p>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={4}
              placeholder="e.g. Refund of ₹250 processed to original payment method."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setTicketToResolve(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                disabled={!resolutionNote.trim() || resolving}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {resolving ? 'Resolving…' : 'Mark Resolved'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SupportTicketsPanel;
