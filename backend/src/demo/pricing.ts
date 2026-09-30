import { IBusiness } from '../models/Business';
import { BasketLine } from './demand';

/**
 * Prices a basket for a history order exactly as services/orderPlacement.service.ts's prepareOrder
 * does for a real one (same item snapshot, tax on the subtotal, commission on the pre-tax value) —
 * but from the café's menu in memory, since history writes thousands of orders at once. Live demo
 * orders don't use this: they go through the real order API. tests/demo.test.ts checks both give
 * the same result for the same basket, so any change to prepareOrder's maths shows up there.
 */
export const priceBasket = (business: Pick<IBusiness, 'taxRatePercentage' | 'commissionRatePercentage'>, lines: BasketLine[]) => {
  let subtotalPaise = 0;
  const items = lines.map(({ entry, quantity }) => {
    const itemTotalPaise = entry.pricePaise * quantity;
    subtotalPaise += itemTotalPaise;
    return {
      productId: entry.productId,
      name: entry.name,
      pricePaise: entry.pricePaise,
      quantity,
      variantName: '',
      addons: [],
      itemTotalPaise,
      notes: ''
    };
  });

  const taxPaise = Math.round((subtotalPaise * (business.taxRatePercentage ?? 0)) / 100);
  const discountPaise = 0;
  const platformFeePaise = Math.round(((subtotalPaise - discountPaise) * (business.commissionRatePercentage ?? 3)) / 100);
  const totalAmountPaise = subtotalPaise + taxPaise;

  return {
    items,
    subtotalPaise,
    discountPaise,
    taxPaise,
    platformFeePaise,
    totalAmountPaise,
    businessEarningsPaise: totalAmountPaise - platformFeePaise
  };
};
