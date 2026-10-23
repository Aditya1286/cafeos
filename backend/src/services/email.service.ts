import { notifications } from '../config';
import { logger } from '../utils/logger';

// Outgoing email through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// No SDK: one POST is all we need. With no API key configured this is a quiet no-op, so dev and
// test machines never send mail.

const RESEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 10_000;

export interface OutgoingEmail {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/** True when an email was handed to Resend. Never throws: a failed email must not fail the caller. */
export const sendEmail = async (email: OutgoingEmail): Promise<boolean> => {
  if (!notifications.resendApiKey || email.to.length === 0) return false;

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notifications.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: notifications.fromEmail,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {})
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!res.ok) {
      logger.error({ status: res.status, body: await res.text() }, '[email] Resend rejected the email');
      return false;
    }
    return true;
  } catch (error) {
    logger.error({ err: error }, '[email] Could not reach Resend');
    return false;
  }
};

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/** For putting visitor-typed text into an email body. */
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
