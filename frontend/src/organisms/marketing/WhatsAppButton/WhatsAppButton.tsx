import React from 'react';
import { MessageCircle } from 'lucide-react';
import { WHATSAPP_HELLO, whatsappLink } from '@/constants/contact';

// A floating "chat with us" button. Bottom-left, because the mascot lives bottom-right.
export const WhatsAppButton: React.FC = () => (
  <a
    href={whatsappLink(WHATSAPP_HELLO)}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with us on WhatsApp"
    className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white pl-3.5 pr-4 py-2.5 shadow-lg shadow-emerald-600/30 transition-colors"
  >
    <MessageCircle className="w-5 h-5" />
    <span className="text-xs font-extrabold">Chat on WhatsApp</span>
  </a>
);

export default WhatsAppButton;
