import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  MessageCircle,
  Phone,
  StickyNote,
  XCircle,
} from 'lucide-react';
import type {
  DemoRequest,
  DemoRequestStatus,
  UpdateDemoRequestPayload,
} from '@/services/superAdmin/demoRequests/types';
import type { DemoLeadUrgency } from '@/constants/demoFunnel';
import {
  URGENCY_LABEL,
  answerMap,
  hoursSince,
  painsFor,
  sourceName,
  tablesOf,
  talkingPointsFor,
  timeAgo,
  urgencyOf,
  whatsAppLink,
} from '@/utils/demoLeads';

export const STATUS_LABEL: Record<DemoRequestStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Called',
  TRIAL_STARTED: 'Trial started',
  WON: 'Won',
  LOST: 'Lost',
};

/** The one obvious next move for a lead in each stage. Won and lost leads are done. */
const NEXT_STEP: Partial<Record<DemoRequestStatus, { status: DemoRequestStatus; label: string }>> =
  {
    NEW: { status: 'CONTACTED', label: 'I called them' },
    CONTACTED: { status: 'TRIAL_STARTED', label: 'Trial started' },
    TRIAL_STARTED: { status: 'WON', label: 'They paid' },
  };

const URGENCY_STYLE: Record<DemoLeadUrgency, string> = {
  hot: 'bg-red-600 text-white border-red-600',
  warm: 'bg-amber-50 text-amber-800 border-amber-200',
  later: 'bg-slate-100 text-slate-600 border-slate-200',
  cold: 'bg-slate-50 text-slate-400 border-slate-200',
};

/** How long a NEW lead has waited, coloured by how urgent the call is now. */
const waitingBadge = (lead: DemoRequest) => {
  const ago = timeAgo(lead.createdAt);
  if (lead.status !== 'NEW')
    return {
      text: `Asked ${ago === 'just now' ? 'just now' : `${ago} ago`}`,
      tone: 'text-slate-400',
    };
  const hours = hoursSince(lead.createdAt);
  if (hours < 1) return { text: `New · ${ago}`, tone: 'text-emerald-600' };
  if (hours < 24) return { text: `Waiting ${ago}`, tone: 'text-amber-600' };
  return { text: `Waiting ${ago}`, tone: 'text-rose-600' };
};

interface LeadCardProps {
  lead: DemoRequest;
  onUpdate: (id: string, payload: UpdateDemoRequestPayload) => Promise<boolean>;
  onEditNote: (lead: DemoRequest) => void;
}

/** One lead, written as a call brief: who, how urgent, what hurts, what to show, and the next tap. */
export const LeadCard: React.FC<LeadCardProps> = ({ lead, onUpdate, onEditNote }) => {
  const urgency = urgencyOf(lead.answers);
  const pains = painsFor(lead.answers);
  const talkingPoints = talkingPointsFor(answerMap(lead.answers));
  const tables = tablesOf(lead.answers);
  const waiting = waitingBadge(lead);
  const next = NEXT_STEP[lead.status];
  const via = lead.source?.utmSource || lead.source?.referrer;

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
      <div className="p-4 sm:p-5 space-y-3 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-900 truncate">{lead.brandName}</h3>
            <p className="text-xs text-slate-600 font-semibold">
              {[lead.name, lead.businessType, lead.city, tables].filter(Boolean).join(' · ')}
            </p>
          </div>
          {urgency && (
            <span
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-black ${URGENCY_STYLE[urgency]}`}
            >
              {urgency === 'hot' && <Flame className="w-3 h-3" />}
              {URGENCY_LABEL[urgency]}
            </span>
          )}
        </div>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold">
          <span className={`inline-flex items-center gap-1 ${waiting.tone}`}>
            <Clock className="w-3 h-3" /> {waiting.text}
          </span>
          {via && <span className="text-slate-400">· via {sourceName(via)}</span>}
          {lead.interestedPlan && (
            <span className="text-slate-400">· looked at {lead.interestedPlan}</span>
          )}
          {lead.status !== 'NEW' && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {STATUS_LABEL[lead.status]}
            </span>
          )}
        </p>

        {pains.length > 0 && (
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              They told us
            </p>
            <ul className="space-y-1">
              {pains.map((pain) => (
                <li
                  key={pain}
                  className="flex items-start gap-2 text-xs font-semibold text-slate-700"
                >
                  <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-400" />
                  {pain}
                </li>
              ))}
            </ul>
          </div>
        )}

        {talkingPoints.length > 0 && (
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Show them on the call
            </p>
            <ul className="space-y-1">
              {talkingPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2 text-xs font-semibold text-slate-700"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-500" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {lead.message && (
          <p className="text-xs text-slate-600 italic bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            “{lead.message}”
          </p>
        )}

        {lead.adminNote ? (
          <button
            onClick={() => onEditNote(lead)}
            className="w-full text-left flex items-start gap-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5 hover:bg-amber-100 transition-colors"
          >
            <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="whitespace-pre-line">{lead.adminNote}</span>
          </button>
        ) : (
          <button
            onClick={() => onEditNote(lead)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-700"
          >
            <StickyNote className="w-3 h-3" /> Add a note
          </button>
        )}
      </div>

      <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
        <a
          href={`tel:+91${lead.phone}`}
          className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black inline-flex items-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5" /> Call {lead.phone}
        </a>
        <a
          href={whatsAppLink(lead.phone, lead.name, lead.brandName)}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black inline-flex items-center gap-1.5"
        >
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </a>
        <div className="ml-auto flex items-center gap-2">
          {lead.status !== 'LOST' && lead.status !== 'WON' && (
            <button
              onClick={() => onUpdate(lead.id, { status: 'LOST' })}
              className="px-2.5 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            >
              Not interested
            </button>
          )}
          {lead.status === 'LOST' && (
            <button
              onClick={() => onUpdate(lead.id, { status: 'NEW' })}
              className="px-2.5 py-2 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-slate-100"
            >
              Move back to New
            </button>
          )}
          {next && (
            <button
              onClick={() => onUpdate(lead.id, { status: next.status })}
              className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-black inline-flex items-center gap-1"
            >
              {next.label} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
