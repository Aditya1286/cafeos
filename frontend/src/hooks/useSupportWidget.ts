import { useState } from 'react';
import supportService from '../services/support';

export type SupportWidgetMode = 'CUSTOMER' | 'BUSINESS_OWNER';
type WidgetView = 'MENU' | 'TICKET_FLOW' | 'CALL' | 'TRACK';
type TicketStep =
  'CATEGORY' | 'SUBCATEGORY' | 'DETAILS' | 'CONTACT' | 'SUBMITTING' | 'CONFIRMATION';

// businessId is required in CUSTOMER mode (createPublicTicket has no other way to identify
// the business — see support.service.ts's raiseTicket) but is derived server-side from the
// session for BUSINESS_OWNER mode. A discriminated union — not an optional field on a flat
// interface — is what makes a missing businessId a compile error at every call site instead
// of a 400 "A valid business is required" surfacing only at submit time.
type UseSupportWidgetArgs =
  | {
      mode: 'CUSTOMER';
      businessId: string;
      orderId?: string;
      prefill?: { name?: string; phone?: string };
    }
  | {
      mode: 'BUSINESS_OWNER';
      businessId?: string;
      orderId?: string;
      prefill?: { name?: string; phone?: string };
    };

/** Drives the floating support widget's sequential flow (category → subcategory → details →
 * contact → submit) plus the standalone "call us" and "track a ticket" side-flows. */
export const useSupportWidget = ({ mode, businessId, orderId, prefill }: UseSupportWidgetArgs) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<WidgetView>('MENU');
  const [step, setStep] = useState<TicketStep>('CATEGORY');

  const [category, setCategory] = useState<string | null>(null);
  const [subCategory, setSubCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState(prefill?.name || '');
  const [contactPhone, setContactPhone] = useState(prefill?.phone || '');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  const [callState, setCallState] = useState<'IDLE' | 'LOADING' | 'FOUND' | 'NONE_AVAILABLE'>(
    'IDLE',
  );
  const [callAgent, setCallAgent] = useState<{ name: string; phone: string } | null>(null);

  const [trackTicketNumber, setTrackTicketNumber] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackResult, setTrackResult] = useState<any | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);

  const resetTicketFlow = () => {
    setStep('CATEGORY');
    setCategory(null);
    setSubCategory(null);
    setDescription('');
    setContactName(prefill?.name || '');
    setContactPhone(prefill?.phone || '');
    setSubmitError(null);
    setTicketNumber(null);
  };

  const openWidget = () => setIsOpen(true);
  const closeWidget = () => setIsOpen(false);

  const goToMenu = () => setView('MENU');

  const startTicketFlow = () => {
    resetTicketFlow();
    setView('TICKET_FLOW');
  };

  const selectCategory = (value: string, hasSubCategories: boolean) => {
    setCategory(value);
    setStep(hasSubCategories ? 'SUBCATEGORY' : 'DETAILS');
  };

  const selectSubCategory = (value: string) => {
    setSubCategory(value);
    setStep('DETAILS');
  };

  // Step back without resetting whatever's already been entered.
  const goToStep = (target: TicketStep) => setStep(target);

  const submitDescription = () => {
    if (!description.trim()) return;
    setStep(mode === 'BUSINESS_OWNER' ? 'SUBMITTING' : 'CONTACT');
    if (mode === 'BUSINESS_OWNER') submitTicket();
  };

  const submitTicket = async () => {
    // Belt-and-suspenders: the discriminated UseSupportWidgetArgs type makes this
    // unreachable from a well-typed call site, but a loosely-typed caller (e.g. plain JS,
    // or a stale prop passed from a wider `any`) could still get here — fail with a clear
    // message instead of letting the request go out and surface the backend's generic 400.
    if (mode === 'CUSTOMER' && !businessId) {
      setSubmitError(
        "We couldn't tell which business this is for — please refresh the page and try again.",
      );
      setStep('CONTACT');
      return;
    }

    setStep('SUBMITTING');
    setSubmitError(null);
    try {
      const payload = { category, subCategory, description: description.trim() };
      const res =
        mode === 'BUSINESS_OWNER'
          ? await supportService.createTicket(payload)
          : await supportService.createPublicTicket({
              ...payload,
              businessId,
              orderId,
              customerName: contactName.trim(),
              customerPhone: contactPhone.trim(),
            });
      setTicketNumber(res.data.ticketNumber);
      setStep('CONFIRMATION');
    } catch (err: any) {
      setSubmitError(err.message || 'Could not raise your ticket. Please try again.');
      setStep(mode === 'BUSINESS_OWNER' ? 'DETAILS' : 'CONTACT');
    }
  };

  const submitContact = () => {
    if (!contactName.trim() || !contactPhone.trim()) return;
    submitTicket();
  };

  const startCallFlow = async () => {
    setView('CALL');
    setCallState('LOADING');
    try {
      const res = await supportService.callAgent();
      setCallAgent(res.data);
      setCallState('FOUND');
    } catch {
      setCallAgent(null);
      setCallState('NONE_AVAILABLE');
    }
  };

  const startTrackFlow = () => {
    setView('TRACK');
    setTrackResult(null);
    setTrackError(null);
  };

  const submitTrack = async () => {
    if (!trackTicketNumber.trim() || !trackPhone.trim()) return;
    setTrackLoading(true);
    setTrackError(null);
    try {
      const res = await supportService.trackTicket(trackTicketNumber.trim(), trackPhone.trim());
      setTrackResult(res.data);
    } catch (err: any) {
      setTrackResult(null);
      setTrackError(err.message || "We couldn't find that ticket.");
    } finally {
      setTrackLoading(false);
    }
  };

  return {
    isOpen,
    openWidget,
    closeWidget,
    view,
    goToMenu,
    startTicketFlow,
    startCallFlow,
    startTrackFlow,
    step,
    category,
    subCategory,
    description,
    setDescription,
    contactName,
    setContactName,
    contactPhone,
    setContactPhone,
    selectCategory,
    selectSubCategory,
    submitDescription,
    submitContact,
    goToStep,
    submitError,
    ticketNumber,
    resetTicketFlow,
    callState,
    callAgent,
    trackTicketNumber,
    setTrackTicketNumber,
    trackPhone,
    setTrackPhone,
    trackResult,
    trackError,
    trackLoading,
    submitTrack,
  };
};
