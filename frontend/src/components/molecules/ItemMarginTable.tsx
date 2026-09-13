import React from 'react';
import { ItemMarginsData } from '../../types';
import { formatCurrency } from '../../utils/money';
import { NoDataAvailable } from './NoDataAvailable';
import { PieChart, AlertTriangle } from 'lucide-react';

interface ItemMarginTableProps {
  data: ItemMarginsData;
}

const marginTone = (pct: number) =>
  pct < 30 ? 'text-rose-600' : pct < 55 ? 'text-amber-600' : 'text-emerald-600';

/** True gross margin per item — selling price vs. actual ingredient cost from its Recipe (BOM),
 * not a guessed food-cost percentage. Lowest margin first, since that's what's worth a second
 * look on pricing or portion size. */
export const ItemMarginTable: React.FC<ItemMarginTableProps> = ({ data }) => {
  const withRecipe = data.items.filter((i) => i.hasRecipe);

  if (withRecipe.length === 0) {
    return (
      <NoDataAvailable
        icon={PieChart}
        title="No item costs tracked yet"
        message="Add a recipe (BOM) to your menu items in the Inventory tab to see true margins here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-slate-400 border-b border-slate-200 uppercase text-[10px] font-extrabold tracking-wider">
            <tr>
              <th className="pb-2">Item</th>
              <th className="pb-2 text-right">Price</th>
              <th className="pb-2 text-right">Cost</th>
              <th className="pb-2 text-right">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {withRecipe.map((item) => (
              <tr key={item.productId}>
                <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                <td className="py-2.5 text-right text-slate-500">{formatCurrency(item.pricePaise)}</td>
                <td className="py-2.5 text-right text-slate-500">{formatCurrency(item.ingredientCostPaise)}</td>
                <td className={`py-2.5 text-right font-black ${marginTone(item.marginPercentage ?? 0)}`}>
                  {item.marginPercentage}% · {formatCurrency(item.marginPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.productsWithoutRecipeCount > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            {data.productsWithoutRecipeCount} item{data.productsWithoutRecipeCount === 1 ? '' : 's'} without a recipe —
            add one in Inventory to see its real margin.
          </span>
        </div>
      )}
    </div>
  );
};

export default ItemMarginTable;
