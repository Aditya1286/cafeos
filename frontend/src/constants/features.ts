// Frontend-only feature switches for the business owner dashboard. Turning one off hides the
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
