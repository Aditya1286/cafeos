import React from 'react';
import { motion } from 'framer-motion';
import { Plus, EyeOff, RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/money';

interface DigitalMenuPanelProps {
  products: any[];
  onAddItem: () => void;
  onEditItem: (product: any) => void;
  onRemoveItem: (productId: string) => void;
  onRestoreItem: (productId: string) => void;
  onDeleteItem: (product: any) => void;
}

export const DigitalMenuPanel = ({ products, onAddItem, onEditItem, onRemoveItem, onRestoreItem, onDeleteItem }: DigitalMenuPanelProps) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-black text-slate-900">Digital Menu</h2>
        <p className="text-xs text-slate-500 font-medium">Manage dishes, categories, and customer prices</p>
      </div>
      <button
        onClick={onAddItem}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all"
      >
        <Plus className="w-4 h-4" /> Add Menu Item
      </button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {products.map(p => (
        <motion.div
          key={p._id}
          whileHover={{ y: -3 }}
          className={`bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col ${
            p.isAvailable === false ? 'opacity-60' : ''
          }`}
        >
          <div className="relative h-40 bg-slate-100">
            <img src={p.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80'} alt={p.name} className={`w-full h-full object-cover ${p.isAvailable === false ? 'grayscale' : ''}`} />
            <div className="absolute top-3 left-3">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                p.isVeg ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {p.isVeg ? '● VEG' : '● NON-VEG'}
              </span>
            </div>
            <div className="absolute top-3 right-3">
              <span className="px-3 py-1 rounded-full bg-white/95 border border-slate-200 text-xs font-black text-slate-900 shadow-xs">
                {formatCurrency(p.pricePaise)}
              </span>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 mb-1">{p.name}</h3>
              <p className="text-xs text-slate-500 font-medium line-clamp-2">{p.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span>{p.preparationTimeMinutes || 15}m prep time</span>
              {p.isAvailable === false ? (
                <span className="text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-black text-[10px]">Removed</span>
              ) : (
                <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-black text-[10px]">Active</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEditItem(p)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold text-[11px] transition-all"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              {p.isAvailable === false ? (
                <button
                  onClick={() => onRestoreItem(p._id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-extrabold text-[11px] transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                </button>
              ) : (
                <button
                  onClick={() => onRemoveItem(p._id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-[11px] transition-all"
                >
                  <EyeOff className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>

            <button
              onClick={() => onDeleteItem(p)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-bold text-[10px] transition-all"
            >
              <Trash2 className="w-3 h-3" /> Delete Item
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

export default DigitalMenuPanel;
