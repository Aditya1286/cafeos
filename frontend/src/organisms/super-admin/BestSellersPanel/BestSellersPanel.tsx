import React from 'react';
import { Coffee } from 'lucide-react';
import EmptyState from '@/atoms/EmptyState';
import { formatCurrency } from '@/utils/money';
import { TopProduct } from '@/types';

interface BestSellersPanelProps {
  bestSellers: TopProduct[];
}

export const BestSellersPanel = ({ bestSellers }: BestSellersPanelProps) => (
  <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
    <div>
      <h3 className="text-base font-extrabold text-slate-900">
        Best-Selling Menu Items
      </h3>
      <p className="text-xs text-slate-500 font-medium">
        Ranked by revenue across every business, paid orders only
      </p>
    </div>

    <div className="space-y-3">
      {bestSellers.length === 0 ? (
        <EmptyState
          title="No paid orders yet"
          description="Best-selling items will show up here once orders are completed."
        />
      ) : (
        bestSellers.map((item) => (
          <div
            key={item._id}
            className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-black text-xs">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900">
                  {item._id}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {item.totalQuantity} sold
                </div>
              </div>
            </div>

            <div className="text-xs font-black text-slate-900">
              {formatCurrency(item.totalRevenuePaise)}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

export default BestSellersPanel;
