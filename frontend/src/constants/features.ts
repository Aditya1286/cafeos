// Frontend-only feature switches for the business owner dashboard. Turning one off hides the
// feature's UI; the code, API calls, and backend behaviour stay in place, so flipping it back
// to true restores everything.

/** Inventory tab, Add Ingredient flow, Low Stock KPI, and the ingredient-cost (BOM) margin view. */
export const INVENTORY_ENABLED = false;
