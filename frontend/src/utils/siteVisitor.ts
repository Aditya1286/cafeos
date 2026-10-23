// Who is visiting the marketing site, without knowing who they are: a random visitor id this
// browser keeps (localStorage), a random id per tab visit (sessionStorage), and where the visit
// came from (the first page of the visit: external referrer host and utm_* tags). Storage can be
// off (private mode, blocked site data); everything still works, the ids just don't persist.

const VISITOR_KEY = 'caos.visitorId';
const SESSION_KEY = 'caos.sessionId';
const SOURCE_KEY = 'caos.visitSource';

export interface VisitSource {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPath?: string;
}

const randomId = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
};

const readOrCreate = (storage: () => Storage, key: string, memo: { value?: string }): string => {
  if (memo.value) return memo.value;
  try {
    const existing = storage().getItem(key);
    if (existing) return (memo.value = existing);
    const fresh = randomId();
    storage().setItem(key, fresh);
    return (memo.value = fresh);
  } catch {
    return (memo.value = randomId());
  }
};

const visitorMemo: { value?: string } = {};
const sessionMemo: { value?: string } = {};
let sourceMemo: VisitSource | undefined;

export const getVisitorId = () => readOrCreate(() => localStorage, VISITOR_KEY, visitorMemo);
export const getSessionId = () => readOrCreate(() => sessionStorage, SESSION_KEY, sessionMemo);

const externalReferrerHost = (): string | undefined => {
  try {
    if (!document.referrer) return undefined;
    const host = new URL(document.referrer).hostname;
    return host && host !== window.location.hostname ? host : undefined;
  } catch {
    return undefined;
  }
};

/** Where this visit came from, fixed by its first page so later pages don't overwrite it. */
export const getVisitSource = (): VisitSource => {
  if (sourceMemo) return sourceMemo;
  try {
    const saved = sessionStorage.getItem(SOURCE_KEY);
    if (saved) return (sourceMemo = JSON.parse(saved) as VisitSource);
  } catch {
    // fall through and work it out from this page
  }
  const params = new URLSearchParams(window.location.search);
  const source: VisitSource = {
    referrer: externalReferrerHost(),
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
    landingPath: window.location.pathname,
  };
  try {
    sessionStorage.setItem(SOURCE_KEY, JSON.stringify(source));
  } catch {
    // not persisted; the memo still holds it for this page
  }
  return (sourceMemo = source);
};
