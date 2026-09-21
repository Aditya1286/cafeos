import React from 'react';
import { Plus } from 'lucide-react';
import { formatCurrencyPrecise } from '@/utils/money';

interface InventoryPanelProps {
  inventoryItems: any[];
  onAddIngredient: () => void;
}

export const InventoryPanel = ({ inventoryItems, onAddIngredient }: InventoryPanelProps) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-black text-slate-900">Inventory Stock & Automatic BOM</h2>
        <p className="text-xs text-slate-500 font-medium">Ingredients automatically deduct when kitchen accepts orders</p>
      </div>
      <button
        onClick={onAddIngredient}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all"
      >
        <Plus className="w-4 h-4" /> Add Ingredient
      </button>
    </div>

    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
          <tr>
            <th className="px-5 py-3.5">Ingredient Name</th>
            <th className="px-5 py-3.5">Stock</th>
            <th className="px-5 py-3.5">Unit</th>
            <th className="px-5 py-3.5">Min Stock Level</th>
            <th className="px-5 py-3.5">Cost/Unit</th>
            <th className="px-5 py-3.5">Stock Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
          {inventoryItems.map(item => (
            <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
              <td className="px-5 py-4 font-black text-slate-900">{item.name}</td>
              <td className="px-5 py-4 text-slate-900 font-bold">{item.currentStock}</td>
              <td className="px-5 py-4 text-slate-500">{item.unit}</td>
              <td className="px-5 py-4 text-slate-500">{item.minimumStockLevel}</td>
              <td className="px-5 py-4">{formatCurrencyPrecise(item.costPerUnitPaise)}</td>
              <td className="px-5 py-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                  item.status === 'IN_STOCK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {item.status === 'IN_STOCK' ? 'In Stock' : 'Low Stock'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default InventoryPanel;
