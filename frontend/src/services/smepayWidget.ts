// Thin wrapper around SMEPay's Wizard checkout widget: the same script and call SMEPay's own
// WooCommerce plugin uses. It opens SMEPay's payment popup over our page instead of sending the
// customer off to the hosted payment_url.
//
// The widget's callbacks only mean "the popup is done", never "the customer paid": whether a
// checkout was paid is decided by the backend asking SMEPay itself (checkout.service.ts).
//
// The script isn't told staging vs production (SMEPay's plugin doesn't pass one either), so it
// behaves like the hosted page: a checkout created on SMEPay staging won't complete in it.
const WIDGET_SCRIPT_URL = 'https://typof.co/smepay/checkout-v2.js';
const LOAD_TIMEOUT_MS = 10_000;
const LOAD_POLL_MS = 100;

declare global {
  interface Window {
    smepayCheckout?: (options: {
      slug: string;
      onSuccess?: () => void;
      // SMEPay calls this when the payment fails and also when the customer closes the popup.
      onFailure?: () => void;
    }) => void;
  }
}

let loadPromise: Promise<void> | null = null;

/**
 * Loads the widget script once, only when a customer actually picks online checkout. A failed
 * load isn't cached, so the next call tries again.
 */
export function loadSmepayWidget(): Promise<void> {
  if (window.smepayCheckout) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;

    let poll: ReturnType<typeof setInterval> | undefined;
    const fail = (message: string) => {
      clearInterval(poll);
      script.remove();
      loadPromise = null;
      reject(new Error(message));
    };

    // Waits for the global itself rather than just onload, in case the script sets it up
    // asynchronously after it has run.
    const startedAt = Date.now();
    poll = setInterval(() => {
      if (window.smepayCheckout) {
        clearInterval(poll);
        resolve();
      } else if (Date.now() - startedAt > LOAD_TIMEOUT_MS) {
        fail('SMEPay checkout took too long to load.');
      }
    }, LOAD_POLL_MS);
    script.onerror = () => fail('Could not load SMEPay checkout.');
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Opens SMEPay's payment popup for one checkout attempt; `onDone` fires when it closes. */
export function openSmepayCheckout(slug: string, onDone: () => void): void {
  window.smepayCheckout?.({ slug, onSuccess: onDone, onFailure: onDone });
}
