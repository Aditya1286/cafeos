import React from 'react';
import { Plus, Package } from 'lucide-react';
import { formatCurrencyPrecise } from '@/utils/money';
import { PanelHeader } from '@/molecules/PanelHeader';
import ResponsiveDataView, { ResponsiveColumn } from '@/molecules/ResponsiveDataView';
import { NoDataAvailable } from '@/molecules/NoDataAvailable';
import { StatusBadge } from '@/atoms/StatusBadge';

interface InventoryPanelProps {
  inventoryItems: any[];
  onAddIngredient: () => void;
}

const StockStatusBadge = ({ item }: { item: any }) => (
  <StatusBadge tone={item.status === 'IN_STOCK' ? 'success' : 'danger'}>
    {item.status === 'IN_STOCK' ? 'In Stock' : 'Low Stock'}
  </StatusBadge>
);

export const InventoryPanel = ({ inventoryItems, onAddIngredient }: InventoryPanelProps) => {
  const columns: ResponsiveColumn<any>[] = [
    { header: 'Ingredient Name', render: (item) => <span className="font-black text-slate-900">{item.name}</span> },
    { header: 'Stock', render: (item) => <span className="text-slate-900 font-bold">{item.currentStock}</span> },
    { header: 'Unit', render: (item) => <span className="text-slate-500">{item.unit}</span> },
    { header: 'Alert Below', render: (item) => <span className="text-slate-500">{item.minimumStockLevel}</span> },
    { header: 'Cost per Unit', render: (item) => formatCurrencyPrecise(item.costPerUnitPaise) },
    { header: 'Stock Status', render: (item) => <StockStatusBadge item={item} /> },
  ];

  return (
    <div className="space-y-6">
      <PanelHeader
        icon={Package}
        title="Stock & Ingredients"
        subtitle="Stock goes down on its own when the kitchen accepts an order"
        actions={
          <button
            onClick={onAddIngredient}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Ingredient
          </button>
        }
      />

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <ResponsiveDataView
          data={inventoryItems}
          keyExtractor={(item) => item._id}
          columns={columns}
          emptyState={
            <NoDataAvailable
              icon={Package}
              title="No ingredients tracked yet"
              message="Add your first ingredient to keep track of how much you have left."
            />
          }
          renderCard={(item) => (
            <div className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <span className="font-black text-slate-900 text-sm min-w-0 truncate">{item.name}</span>
                <StockStatusBadge item={item} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">Stock</div>
                  <div className="font-bold text-slate-900">{item.currentStock} {item.unit}</div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">Min Level</div>
                  <div className="font-bold text-slate-700">{item.minimumStockLevel} {item.unit}</div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">Cost per Unit</div>
                  <div className="font-bold text-slate-700">{formatCurrencyPrecise(item.costPerUnitPaise)}</div>
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default InventoryPanel;
