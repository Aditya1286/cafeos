import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/organisms/marketing/Navbar';
import { Footer } from '@/organisms/marketing/Footer';
import { APP_NAME } from '../constants/app';
import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from '../constants/privacyPolicy';

export const PrivacyPage: React.FC = () => (
  <div className="min-h-screen bg-page text-slate-900 flex flex-col font-sans">
    <Navbar />

    <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to home
      </Link>

      <div className="space-y-2">
        <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-red-600">
          Privacy
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          {APP_NAME} Privacy Policy
        </h1>
        <p className="text-xs text-slate-400 font-mono">Last updated {PRIVACY_UPDATED}</p>
      </div>

      {PRIVACY_SECTIONS.map((section, i) => (
        <section key={section.title} className="space-y-2.5">
          <h2 className="text-sm font-black text-slate-900 flex items-baseline gap-2">
            <span className="text-red-600 font-mono">{String(i + 1).padStart(2, '0')}</span>
            {section.title}
          </h2>
          <div className="text-[13px] text-slate-600 leading-relaxed space-y-2.5 pl-6">
            {section.body?.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {section.bullets && (
              <ul className="list-disc pl-4 space-y-1.5">
                {section.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ))}
    </main>

    <Footer />
  </div>
);

export default PrivacyPage;
