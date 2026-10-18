import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { DEMO_PATH } from '@/constants/demo';
import { WHATSAPP_HELLO, whatsappLink } from '@/constants/contact';

interface DemoBannerProps {
  /** `menu` sits above the demo café's menu; `order` shows after a visitor has placed an order. */
  variant: 'menu' | 'order';
}

const COPY = {
  menu: {
    title: 'Demo café',
    body: 'Order anything. Nothing is charged, and the order is deleted a few hours later.',
  },
  order: {
    title: 'That is how your guests will order',
    body: 'Want this in your café? We can have you live in 1 hour.',
  },
};

export const DemoBanner: React.FC<DemoBannerProps> = ({ variant }) => (
  <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
    <p className="text-[11px] sm:text-xs font-medium leading-snug">
      <span className="font-black">{COPY[variant].title}.</span> {COPY[variant].body}
    </p>
    <div className="flex items-center gap-2 shrink-0">
      <Link
        to={DEMO_PATH}
        className="text-[11px] font-extrabold px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
      >
        Get this for your café
      </Link>
      <a
        href={whatsappLink(WHATSAPP_HELLO)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
      </a>
    </div>
  </div>
);

export default DemoBanner;
