import React from 'react';
import { LifeBuoy, X, PhoneCall, MessageCircleQuestion, Search, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useSupportWidget } from '@/hooks/useSupportWidget';
import { getSupportCategories } from '@/constants/supportCategories';

// businessId is required in CUSTOMER mode — mirrors useSupportWidget.ts's discriminated
// union, so a call site that forgets it (e.g. <SupportWidget mode="CUSTOMER" />) is a
// compile error rather than a 400 the customer only sees after filling out the whole flow.
type SupportWidgetProps =
  | { mode: 'CUSTOMER'; businessId: string; orderId?: string; prefill?: { name?: string; phone?: string }; raised?: boolean }
  | { mode: 'BUSINESS_OWNER'; businessId?: string; orderId?: string; prefill?: { name?: string; phone?: string }; raised?: boolean };

// Floating support entry point used on both customer-facing pages (mode="CUSTOMER") and the
// owner dashboard (mode="BUSINESS_OWNER"). One component, two contact-collection paths — the
// sequential category → subcategory → details flow is identical either way.
export const SupportWidget: React.FC<SupportWidgetProps> = (props) => {
  const { mode, raised } = props;
  const w = useSupportWidget(props);
  const categories = getSupportCategories(mode);
  const activeCategoryDef = categories.find((c) => c.value === w.category);

  const Bubble = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 mt-0.5">
        <LifeBuoy className="w-3.5 h-3.5" />
      </div>
      <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs font-semibold text-slate-700 max-w-[85%]">
        {children}
      </div>
    </div>
  );

  const BackRow = ({ onBack }: { onBack: () => void }) => (
    <button onClick={onBack} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
      <ChevronLeft className="w-3.5 h-3.5" /> Back
    </button>
  );

  const renderMenu = () => (
    <div className="space-y-3">
      <Bubble>Hi! What can we help you with today?</Bubble>
      <div className="space-y-2 pl-9">
        <button
          onClick={w.startTicketFlow}
          className="w-full text-left px-3.5 py-3 rounded-2xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-all flex items-center gap-2.5"
        >
          <MessageCircleQuestion className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Raise a support ticket</span>
        </button>
        <button
          onClick={w.startCallFlow}
          className="w-full text-left px-3.5 py-3 rounded-2xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-all flex items-center gap-2.5"
        >
          <PhoneCall className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Call us now</span>
        </button>
        {mode === 'CUSTOMER' && (
          <button
            onClick={w.startTrackFlow}
            className="w-full text-left px-3.5 py-3 rounded-2xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-all flex items-center gap-2.5"
          >
            <Search className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-xs font-bold text-slate-800">Track my ticket</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderTicketFlow = () => {
    if (w.step === 'CATEGORY') {
      return (
        <div className="space-y-3">
          <BackRow onBack={w.goToMenu} />
          <Bubble>What's this about?</Bubble>
          <div className="grid grid-cols-1 gap-1.5 pl-9">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => w.selectCategory(c.value, c.subCategories.length > 0)}
                className="text-left px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-[11px] font-bold text-slate-700 transition-all"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (w.step === 'SUBCATEGORY' && activeCategoryDef) {
      return (
        <div className="space-y-3">
          <BackRow onBack={() => w.goToStep('CATEGORY')} />
          <Bubble>Got it — {activeCategoryDef.label}. Which of these fits best?</Bubble>
          <div className="grid grid-cols-1 gap-1.5 pl-9">
            {activeCategoryDef.subCategories.map((s) => (
              <button
                key={s}
                onClick={() => w.selectSubCategory(s)}
                className="text-left px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-[11px] font-bold text-slate-700 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (w.step === 'DETAILS') {
      return (
        <div className="space-y-3">
          <BackRow onBack={() => w.goToStep(activeCategoryDef && activeCategoryDef.subCategories.length > 0 ? 'SUBCATEGORY' : 'CATEGORY')} />
          <Bubble>Tell us a bit more about what happened.</Bubble>
          <div className="pl-9 space-y-2">
            <textarea
              value={w.description}
              onChange={(e) => w.setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the issue…"
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
              autoFocus
            />
            {w.submitError && <p className="text-[11px] font-bold text-rose-600">{w.submitError}</p>}
            <button
              onClick={w.submitDescription}
              disabled={!w.description.trim()}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black transition-all disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      );
    }

    if (w.step === 'CONTACT') {
      return (
        <div className="space-y-3">
          <BackRow onBack={() => w.goToStep('DETAILS')} />
          <Bubble>Last step — how should we reach you?</Bubble>
          <div className="pl-9 space-y-2">
            <input
              type="text"
              value={w.contactName}
              onChange={(e) => w.setContactName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
            />
            <input
              type="tel"
              value={w.contactPhone}
              onChange={(e) => w.setContactPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
            />
            {w.submitError && <p className="text-[11px] font-bold text-rose-600">{w.submitError}</p>}
            <button
              onClick={w.submitContact}
              disabled={!w.contactName.trim() || !w.contactPhone.trim()}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black transition-all disabled:opacity-40"
            >
              Submit ticket
            </button>
          </div>
        </div>
      );
    }

    if (w.step === 'SUBMITTING') {
      return (
        <div className="py-8 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
          <p className="text-xs font-bold text-slate-500">Raising your ticket…</p>
        </div>
      );
    }

    // CONFIRMATION
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center text-center gap-2 py-2">
          <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          <p className="text-xs font-bold text-slate-700">Ticket raised! Our team will reach out to you soon.</p>
          <div className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
            {w.ticketNumber}
          </div>
          {mode === 'CUSTOMER' && <p className="text-[10px] text-slate-400 font-medium">Save this number to track your ticket later.</p>}
        </div>
        <button
          onClick={w.goToMenu}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all"
        >
          Done
        </button>
      </div>
    );
  };

  const renderCall = () => (
    <div className="space-y-3">
      <BackRow onBack={w.goToMenu} />
      {w.callState === 'LOADING' && (
        <div className="py-8 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
          <p className="text-xs font-bold text-slate-500">Finding someone free to talk…</p>
        </div>
      )}
      {w.callState === 'FOUND' && w.callAgent && (
        <div className="space-y-3">
          <Bubble>{w.callAgent.name} is available right now.</Bubble>
          <a
            href={`tel:${w.callAgent.phone}`}
            className="pl-9 flex items-center justify-center gap-2 w-[calc(100%-2.25rem)] ml-9 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5" /> Call {w.callAgent.phone}
          </a>
        </div>
      )}
      {w.callState === 'NONE_AVAILABLE' && (
        <div className="space-y-3">
          <Bubble>No one's free to take a call right now — sorry! Raise a ticket instead and we'll reach out.</Bubble>
          <button
            onClick={w.startTicketFlow}
            className="ml-9 w-[calc(100%-2.25rem)] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black transition-all"
          >
            Raise a ticket
          </button>
        </div>
      )}
    </div>
  );

  const renderTrack = () => (
    <div className="space-y-3">
      <BackRow onBack={w.goToMenu} />
      <Bubble>Enter your ticket number and phone to check its status.</Bubble>
      <div className="pl-9 space-y-2">
        <input
          type="text"
          value={w.trackTicketNumber}
          onChange={(e) => w.setTrackTicketNumber(e.target.value)}
          placeholder="Ticket number (e.g. SUP-ART-120926-0001)"
          className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
        />
        <input
          type="tel"
          value={w.trackPhone}
          onChange={(e) => w.setTrackPhone(e.target.value)}
          placeholder="Phone number used when raising it"
          className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
        />
        {w.trackError && <p className="text-[11px] font-bold text-rose-600">{w.trackError}</p>}
        <button
          onClick={w.submitTrack}
          disabled={!w.trackTicketNumber.trim() || !w.trackPhone.trim() || w.trackLoading}
          className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black transition-all disabled:opacity-40"
        >
          {w.trackLoading ? 'Checking…' : 'Check status'}
        </button>
        {w.trackResult && (
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-400">{w.trackResult.status.replace('_', ' ')}</div>
            {w.trackResult.resolutionNote && (
              <p className="text-xs text-slate-600 italic">"{w.trackResult.resolutionNote}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={w.isOpen ? w.closeWidget : w.openWidget}
        className={`fixed right-4 sm:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-2xl shadow-orange-500/40 flex items-center justify-center transition-all active:scale-95 ${
          raised ? 'bottom-24 sm:bottom-6' : 'bottom-4 sm:bottom-6'
        }`}
        aria-label="Support"
      >
        {w.isOpen ? <X className="w-5 h-5" /> : <LifeBuoy className="w-5 h-5" />}
      </button>

      {w.isOpen && (
        <div className={`fixed right-4 sm:right-6 z-40 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] max-w-sm max-h-[70vh] bg-slate-50 rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden ${
          raised ? 'bottom-40 sm:bottom-24' : 'bottom-20 sm:bottom-24'
        }`}>
          <div className="px-4 py-3.5 bg-white border-b border-slate-200 flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-black text-slate-900">Support</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {w.view === 'MENU' && renderMenu()}
            {w.view === 'TICKET_FLOW' && renderTicketFlow()}
            {w.view === 'CALL' && renderCall()}
            {w.view === 'TRACK' && renderTrack()}
          </div>
        </div>
      )}
    </>
  );
};

export default SupportWidget;
