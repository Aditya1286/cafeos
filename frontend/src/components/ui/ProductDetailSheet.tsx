import React from 'react';
import { X, TrendingUp, DollarSign, Clock, PackageCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductDetailSheetProps {
  product: {
    name: string;
    category: string;
    ordersCount: number;
    revenue: number;
    marginPercent: number;
    peakHour: string;
    stockStatus: string;
  } | null;
  onClose: () => void;
}

export const ProductDetailSheet: React.FC<ProductDetailSheetProps> = ({
  product,
  onClose,
}) => {
  if (!product) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex justify-end"
        style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md bg-white border-l border-slate-200 h-full p-6 sm:p-8 flex flex-col justify-between overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-200 mb-6">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-600">
                  {product.category}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {product.name}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-red-500" /> Orders Sold
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {product.ordersCount.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Gross Revenue
                </div>
                <div className="text-2xl font-black text-emerald-600">
                  ₹{product.revenue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Detail Rows */}
            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4 text-amber-500" /> Peak Order Time
                </span>
                <span className="font-extrabold text-slate-900">{product.peakHour}</span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-2 text-slate-500">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Profit Margin
                </span>
                <span className="font-extrabold text-emerald-600">
                  {product.marginPercent}%
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-2 text-slate-500">
                  <PackageCheck className="w-4 h-4 text-blue-500" /> Inventory Health
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                  product.stockStatus === 'Healthy'
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}>
                  {product.stockStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-bold shadow hover:bg-slate-800 transition-colors"
            >
              Close Product Sheet
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProductDetailSheet;
