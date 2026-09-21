import { useState } from 'react';
import { apiRequest } from '../services/api';

export type SupportWidgetMode = 'CUSTOMER' | 'BUSINESS_OWNER';
type WidgetView = 'MENU' | 'TICKET_FLOW' | 'CALL' | 'TRACK';
type TicketStep = 'CATEGORY' | 'SUBCATEGORY' | 'DETAILS' | 'CONTACT' | 'SUBMITTING' | 'CONFIRMATION';

interface UseSupportWidgetArgs {
  mode: SupportWidgetMode;
  businessId?: string;
  orderId?: string;
  prefill?: { name?: string; phone?: string };
}

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

  const [callState, setCallState] = useState<'IDLE' | 'LOADING' | 'FOUND' | 'NONE_AVAILABLE'>('IDLE');
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
    setStep('SUBMITTING');
    setSubmitError(null);
    try {
      const payload = { category, subCategory, description: description.trim() };
      const res =
        mode === 'BUSINESS_OWNER'
          ? await apiRequest('/support/tickets', 'POST', payload)
          : await apiRequest('/public/support/tickets', 'POST', {
              ...payload,
              businessId,
              orderId,
              customerName: contactName.trim(),
              customerPhone: contactPhone.trim()
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
      const res = await apiRequest('/public/support/call-agent');
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
      const res = await apiRequest(
        `/public/support/tickets/${encodeURIComponent(trackTicketNumber.trim())}/status?phone=${encodeURIComponent(trackPhone.trim())}`
      );
      setTrackResult(res.data);
    } catch (err: any) {
      setTrackResult(null);
      setTrackError(err.message || "We couldn't find that ticket.");
    } finally {
      setTrackLoading(false);
    }
  };

  return {
    isOpen, openWidget, closeWidget,
    view, goToMenu, startTicketFlow, startCallFlow, startTrackFlow,
    step,
    category, subCategory, description, setDescription, contactName, setContactName, contactPhone, setContactPhone,
    selectCategory, selectSubCategory, submitDescription, submitContact, goToStep,
    submitError, ticketNumber, resetTicketFlow,
    callState, callAgent,
    trackTicketNumber, setTrackTicketNumber, trackPhone, setTrackPhone, trackResult, trackError, trackLoading, submitTrack
  };
};
