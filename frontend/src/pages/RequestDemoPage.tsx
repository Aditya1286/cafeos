import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Gift, MonitorPlay, Coffee, ArrowLeft, QrCode } from 'lucide-react';
import { Navbar } from '@/organisms/marketing/Navbar';
import { Footer } from '@/organisms/marketing/Footer';
import { APP_NAME } from '@/constants/app';
import { BUSINESS_TYPES, DEMO_MENU_PATH } from '@/constants/demo';
import demoRequestsService from '@/services/public/demoRequests';

interface DemoForm {
  name: string;
  brand: string;
  phone: string;
  email: string;
  city: string;
  businessType: string;
  message: string;
  consent: boolean;
  website: string; // honeypot: hidden from people, bots fill it
}

const EMPTY_FORM: DemoForm = {
  name: '',
  brand: '',
  phone: '',
  email: '',
  city: '',
  businessType: '',
  message: '',
  consent: false,
  website: '',
};

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all';
const labelClass = 'block text-xs font-bold text-slate-700 mb-1.5';

export const RequestDemoPage: React.FC = () => {
  const [form, setForm] = useState<DemoForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const interestedPlan = searchParams.get('plan') || undefined;

  const set =
    (key: keyof DemoForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!form.consent) {
      setError('Please tick the box so we can call you about your free trial.');
      return;
    }

    setSubmitting(true);
    try {
      await demoRequestsService.submit({
        name: form.name,
        brandName: form.brand,
        phone: form.phone,
        email: form.email || undefined,
        city: form.city,
        businessType: form.businessType || undefined,
        message: form.message || undefined,
        interestedPlan,
        consentToContact: form.consent,
        website: form.website,
      });
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 px-4 lg:px-8 py-14 md:py-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-start">
          <div className="lg:col-span-2 space-y-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to home
            </Link>

            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1] mb-4">
                See {APP_NAME} running in <span className="text-red-600">your café.</span>
              </h1>
              <p className="text-slate-600 font-medium leading-relaxed">
                Tell us about your café and your 2-week free trial starts. We'll call you, show you
                the product, and set up your menu and QR codes with you.
              </p>
            </div>

            <ul className="space-y-5">
              {[
                {
                  icon: Gift,
                  title: '2 weeks free',
                  body: 'Try it in your own café before you decide anything.',
                },
                {
                  icon: MonitorPlay,
                  title: 'A live walkthrough',
                  body: 'See the real product working, not slides.',
                },
                {
                  icon: Coffee,
                  title: 'Set up around your café',
                  body: 'We go through your menu, your tables and how your team works.',
                },
              ].map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{title}</p>
                    <p className="text-xs text-slate-600 font-medium">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8">
            {sent ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black">You're in, {form.name.split(' ')[0]}!</h2>
                <p className="text-sm text-slate-600 font-medium max-w-sm mx-auto">
                  We've got your request and we'll call you on +91 {form.phone} to start your free
                  trial for {form.brand}.
                </p>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                  While you wait, see what your guests will see when they scan a table QR.
                </p>
                <Link
                  to={DEMO_MENU_PATH}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-600/20 transition-all"
                >
                  <QrCode className="w-4 h-4" /> Try the guest experience
                </Link>
                <div>
                  <Link to="/#pricing" className="text-xs font-bold text-red-600 hover:underline">
                    See pricing
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h2 className="text-xl font-black">Start your free trial</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Takes about a minute. No payment needed to ask.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} htmlFor="demo-name">
                      Your name
                    </label>
                    <input
                      id="demo-name"
                      required
                      maxLength={100}
                      autoComplete="name"
                      className={inputClass}
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Aditya Sharma"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="demo-brand">
                      Café / restaurant name
                    </label>
                    <input
                      id="demo-brand"
                      required
                      maxLength={120}
                      autoComplete="organization"
                      className={inputClass}
                      value={form.brand}
                      onChange={set('brand')}
                      placeholder="The Artisan Roastery"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="demo-phone">
                      Phone number
                    </label>
                    <div className="flex">
                      <span className="px-3 flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-sm text-slate-600 font-semibold">
                        +91
                      </span>
                      <input
                        id="demo-phone"
                        required
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={10}
                        className={`${inputClass} rounded-l-none`}
                        value={form.phone}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))
                        }
                        placeholder="98765 43210"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="demo-city">
                      City
                    </label>
                    <input
                      id="demo-city"
                      required
                      maxLength={80}
                      autoComplete="address-level2"
                      className={inputClass}
                      value={form.city}
                      onChange={set('city')}
                      placeholder="Mumbai"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="demo-email">
                      Email <span className="font-medium text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="demo-email"
                      type="email"
                      maxLength={160}
                      autoComplete="email"
                      className={inputClass}
                      value={form.email}
                      onChange={set('email')}
                      placeholder="you@yourcafe.com"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="demo-type">
                      Business type <span className="font-medium text-slate-400">(optional)</span>
                    </label>
                    <select
                      id="demo-type"
                      className={inputClass}
                      value={form.businessType}
                      onChange={set('businessType')}
                    >
                      <option value="">Select your business</option>
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="demo-message">
                    Anything we should know?{' '}
                    <span className="font-medium text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="demo-message"
                    rows={3}
                    maxLength={1000}
                    className={inputClass}
                    value={form.message}
                    onChange={set('message')}
                  />
                </div>

                {/* Honeypot: off-screen, not focusable, ignored by people. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label htmlFor="demo-website">Website</label>
                  <input
                    id="demo-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={set('website')}
                  />
                </div>

                <label className="flex items-start gap-3 text-xs text-slate-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-red-600 shrink-0"
                  />
                  <span>
                    I agree that {APP_NAME} can call or WhatsApp me about my free trial. Your
                    details are only used for this, and never shared.
                  </span>
                </label>

                {error && (
                  <p role="alert" className="text-xs font-semibold text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-extrabold text-sm shadow-lg shadow-red-600/25 transition-all"
                >
                  {submitting ? 'Sending…' : 'Start my free trial'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
