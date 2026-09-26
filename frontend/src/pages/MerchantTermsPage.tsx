import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/organisms/marketing/Navbar';
import { Footer } from '@/organisms/marketing/Footer';
import { APP_NAME } from '../constants/app';

const Section: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({
  n,
  title,
  children,
}) => (
  <section className="space-y-2.5">
    <h2 className="text-sm font-black text-slate-900 flex items-baseline gap-2">
      <span className="text-red-600 font-mono">{String(n).padStart(2, '0')}</span>
      {title}
    </h2>
    <div className="text-[13px] text-slate-600 leading-relaxed space-y-2.5 pl-6">{children}</div>
  </section>
);

export const MerchantTermsPage: React.FC = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
    <Navbar />

    <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
      <Link
        to="/register"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sign up
      </Link>

      <div className="space-y-2">
        <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-red-600">
          Merchant Agreement
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          {APP_NAME} Merchant Terms of Service
        </h1>
        <p className="text-xs text-slate-400 font-mono">Draft version · last updated 2026-09-13</p>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>This is a working draft, not a finished legal document.</strong> It was written to
          describe how the product actually behaves today, but it has not been reviewed by a lawyer
          and should not be presented to real merchants as binding until qualified counsel has
          reviewed it — particularly the tax (GST/TDS), late-payment, and liability sections below.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-7">
        <Section n={1} title="What this agreement covers">
          <p>
            This agreement is between {APP_NAME} ("the platform", "we") and the business that
            registers an account ("you", "the business"). It governs your use of the digital menu,
            QR ordering, kitchen display, inventory, and analytics tools, and — the part most likely
            to matter in a dispute — how commission is calculated, billed, and settled between us.
          </p>
        </Section>

        <Section n={2} title="What the platform does, and does not, hold">
          <p>
            When a customer pays online, the payment goes directly to <strong>your own</strong> UPI
            ID as configured in your Settings — {APP_NAME} never receives, holds, or routes customer
            funds. Cash and counter payments are collected by you directly, as always. The
            platform's only financial relationship with you is collecting the commission described
            below.
          </p>
        </Section>

        <Section n={3} title="Commission">
          <p>
            You pay us a small fee (a percentage) on every paid order, worked out before tax. You
            can see your rate in your dashboard under Fees &amp; Payments. The rate is set for each
            business and may change — we'll tell you first, and a new rate never applies to a
            billing period that has already ended.
          </p>
        </Section>

        <Section n={4} title="Billing cycles and due dates">
          <p>
            Your fees add up over a fixed billing period (7 days by default). At the end of each
            period we total the fees for that period and set a date to pay by. You can see every
            period — current and past — in your Fees &amp; Payments tab at any time. Nothing is
            hidden.
          </p>
        </Section>

        <Section n={5} title="How you pay, and when it counts as paid">
          <p>
            Your dashboard shows a UPI QR code / payment link for the platform's own account. Paying
            that amount and telling us you've paid (you can add the UPI reference number) lets us
            know right away, but
            <strong>
              {' '}
              a period is only marked "Paid" once we see the money in our bank account
            </strong>{' '}
            — just telling us isn't enough on its own. We aim to confirm promptly; if a payment
            doesn't show up as confirmed within a reasonable time after you've reported it, contact
            us with your reference number.
          </p>
          <p>
            Later, we plan to add automatic online payments (like Razorpay), so you won't need to
            tell us you've paid. Until then, this is how fees are collected.
          </p>
        </Section>

        <Section n={6} title="Late fees">
          <p>
            If a period isn't paid by its due date, it's late. If late fees stay unpaid, we may
            limit your account — including stopping new orders — until you pay what's owed.{' '}
            <em>
              Specific grace periods, late fees, or interest, if any, will be set out separately and
              are not yet defined in this draft.
            </em>
          </p>
        </Section>

        <Section n={7} title="Taxes">
          <p>
            The fee rate shown doesn't include GST. We plan to send a proper GST bill for each
            billing period; that isn't built yet, so please request an invoice directly from support
            for any period until it is. Any tax deducted at source that applies to payments between
            us is your and our respective legal obligation to handle correctly — this agreement
            doesn't override tax law, and neither of us should treat silence here as guidance on it.
          </p>
        </Section>

        <Section n={8} title="Your data, and your customers' data">
          <p>
            Order data (items, amounts, table, timestamps) and the name/phone number a customer
            provides at checkout are stored so you can fulfill and look up orders. We don't sell
            this data. If you stop using the platform, you can request an export of your historical
            order and menu data before your account is closed.
          </p>
        </Section>

        <Section n={9} title="Suspension and termination">
          <p>
            Either party may terminate this agreement at any time. We may suspend or terminate your
            account immediately for non-payment past the point described in Section 6, for
            fraudulent activity, or for use that violates applicable law. Terminating your account
            does not cancel commission already owed for periods that closed before termination.
          </p>
        </Section>

        <Section n={10} title="No liability for lost orders or downtime">
          <p>
            The platform is provided as-is during this stage of the product. We'll work to keep it
            available and orders flowing reliably, but we're not liable for lost revenue, spoiled
            inventory, or other business losses arising from downtime, bugs, or third-party failures
            (SMS/OTP delivery, UPI app behavior, your internet connection) that are outside our
            direct control.
          </p>
        </Section>

        <Section n={11} title="Governing law">
          <p>
            This agreement is governed by the laws of India. Any dispute arising from it will first
            be attempted to be resolved by good-faith discussion between the parties before any
            other action.
          </p>
        </Section>

        <Section n={12} title="Questions">
          <p>
            If anything here is unclear, or you want a copy of your specific commission and billing
            history for your own records, reach out through the support contact in your dashboard
            rather than assuming — we'd rather explain it than have you guess.
          </p>
        </Section>
      </div>
    </main>

    <Footer />
  </div>
);

export default MerchantTermsPage;
