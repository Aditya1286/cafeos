// Thin wrapper around MSG91's OTP Widget script. The widget talks to MSG91 directly from
// the browser (send + verify + its own bot/flood protection) — our backend only validates
// the resulting token afterwards (see otp.controller.ts's confirmWidgetToken).
//
// For this MSG91 widget product, `tokenAuth` IS the account Auth Key — MSG91's own
// dashboard-generated embed snippet confirms this (it's not a separate scoped token like
// some of their other docs suggest). That means this key is unavoidably visible in page
// source once the widget is live; that's how MSG91 built this product, not a mistake here.
const WIDGET_SCRIPT_URLS = ['https://verify.msg91.com/otp-provider.js', 'https://verify.phone91.com/otp-provider.js'];
const WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID || '';
const WIDGET_TOKEN = import.meta.env.VITE_MSG91_WIDGET_TOKEN || '';

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
    sendOtp?: (identifier: string, success?: (data: any) => void, failure?: (error: any) => void) => void;
    verifyOtp?: (otp: string | number, success?: (data: any) => void, failure?: (error: any) => void, reqId?: string) => void;
    retryOtp?: (channel: string, success?: (data: any) => void, failure?: (error: any) => void, reqId?: string) => void;
  }
}

let loadPromise: Promise<void> | null = null;

// After initSendOTP() runs, the widget fires its own async call to
// control.msg91.com/.../getWidgetProcess to fetch its config before it's actually able to
// send/verify — window.sendOtp exists as a function immediately, but calling it before this
// completes gets silently dropped (no success/failure callback ever fires, no SMS sent
// either — confirmed by network inspection, so this is safe to wait out rather than a bug
// that needs a retry). We patch fetch/XHR just long enough to detect that one call finishing,
// with a fail-open timeout in case MSG91 changes how they load it.
function waitForWidgetProcessReady(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const originalFetch = window.fetch?.bind(window);
    const originalOpen = XMLHttpRequest.prototype.open;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (originalFetch) window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalOpen;
      clearTimeout(timer);
      resolve();
    };

    if (originalFetch) {
      window.fetch = ((...args: Parameters<typeof fetch>) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url;
        const result = originalFetch(...args);
        if (url && url.includes('getWidgetProcess')) result.finally(finish);
        return result;
      }) as typeof fetch;
    }

    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: any[]) {
      if (String(url).includes('getWidgetProcess')) {
        this.addEventListener('loadend', finish);
      }
      // @ts-expect-error - forwarding arbitrary XHR.open overload args
      return originalOpen.call(this, method, url, ...rest);
    };

    const timer = setTimeout(finish, timeoutMs);
  });
}

/** Loads and initializes the widget exactly once, no matter how many components call it. */
export function loadMsg91Widget(captchaRenderId?: string): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!WIDGET_ID || !WIDGET_TOKEN) {
      reject(new Error('MSG91 widget is not configured (missing VITE_MSG91_WIDGET_ID / VITE_MSG91_WIDGET_TOKEN).'));
      return;
    }

    let urlIndex = 0;
    const tryLoad = () => {
      const script = document.createElement('script');
      script.src = WIDGET_SCRIPT_URLS[urlIndex];
      script.async = true;
      script.onload = () => {
        const ready = waitForWidgetProcessReady();
        window.initSendOTP?.({
          widgetId: WIDGET_ID,
          tokenAuth: WIDGET_TOKEN,
          exposeMethods: true,
          captchaRenderId: captchaRenderId || '',
          success: () => {},
          failure: () => {}
        });
        ready.then(resolve);
      };
      // Mirrors MSG91's own embed snippet: fall back to the mirror host if the primary fails.
      script.onerror = () => {
        urlIndex += 1;
        if (urlIndex < WIDGET_SCRIPT_URLS.length) {
          tryLoad();
        } else {
          reject(new Error('Could not load MSG91 widget script.'));
        }
      };
      document.head.appendChild(script);
    };
    tryLoad();
  });

  return loadPromise;
}

export function widgetSendOtp(identifier: string): Promise<any> {
  return new Promise((resolve, reject) => {
    window.sendOtp?.(identifier, resolve, reject);
  });
}

export function widgetVerifyOtp(otp: string): Promise<any> {
  return new Promise((resolve, reject) => {
    window.verifyOtp?.(otp, resolve, reject);
  });
}

export function widgetRetryOtp(channel: 'text' | 'voice' = 'text'): Promise<any> {
  const channelCode = channel === 'voice' ? '4' : '11';
  return new Promise((resolve, reject) => {
    window.retryOtp?.(channelCode, resolve, reject);
  });
}
