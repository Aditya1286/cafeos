// Frontend-only feature switches (owner dashboard and customer pages). Turning one off hides the
// feature's UI; the code, API calls, and backend behaviour stay in place, so flipping it back
// to true restores everything.

/** Inventory tab, Add Ingredient flow, Low Stock KPI, and the ingredient-cost (BOM) margin view. */
export const INVENTORY_ENABLED = false;

/**
 * SMEPay online checkout: "Pay Online" on the customer menu, the owner's Settings card, the Super
 * Admin allow-toggle, and the order-history filter. Backend stays in place; flip to true to restore.
 * (A customer already mid-payment, or a past CHECKOUT order, still resolves — those screens are
 * only reachable from an existing checkout/order, so they're deliberately not gated.)
 */
export const SMEPAY_CHECKOUT_ENABLED = false;

/**
 * The customer-facing support widget (raise a ticket, call us, track a ticket) on the menu and
 * order-tracking pages. Backend, tickets and the Super Admin support desk stay in place; flip to
 * true to show the widget again.
 */
export const CUSTOMER_SUPPORT_ENABLED = false;

/**
 * Everything that asks a business for fees or payment: the owner's Fees & Payments tab (the
 * remittance cycle: what's owed, pay-by dates, "I've paid"), the fee tile and plan-upgrade payment
 * in Settings, and on the Super Admin side the Fee Payments queue, plan-upgrade requests and the
 * per-business fee settings and history. The backend, ledger and remittance records stay in place;
 * flip to true to restore the screens.
 */
export const FEES_AND_PAYMENTS_ENABLED = false;
