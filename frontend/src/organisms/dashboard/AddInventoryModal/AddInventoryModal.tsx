import React from 'react';
import { Modal } from '@/molecules/Modal';
import { FormField, inputCls } from '@/molecules/FormField';

interface AddInventoryModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  setName: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  stock: number;
  setStock: (v: number) => void;
  minStock: number;
  setMinStock: (v: number) => void;
  costPaise: number;
  setCostPaise: (v: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AddInventoryModal = ({
  open,
  onClose,
  name,
  setName,
  unit,
  setUnit,
  stock,
  setStock,
  minStock,
  setMinStock,
  costPaise,
  setCostPaise,
  onSubmit,
}: AddInventoryModalProps) => {
  if (!open) return null;

  return (
    <Modal title="Add Ingredient" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Ingredient Name">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Arabica Coffee Beans"
            className={inputCls}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Unit">
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
              <option value="KG">KG</option>
              <option value="GRAM">Gram</option>
              <option value="LITER">Liter</option>
              <option value="ML">ML</option>
              <option value="PIECE">Piece</option>
              <option value="PACKET">Packet</option>
            </select>
          </FormField>
          <FormField label="Current Stock">
            <input
              type="number"
              required
              min={0}
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className={inputCls}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Min. Stock Alert">
            <input
              type="number"
              required
              min={0}
              value={minStock}
              onChange={(e) => setMinStock(Number(e.target.value))}
              className={inputCls}
            />
          </FormField>
          <FormField label="Cost / Unit (₹)">
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={costPaise / 100}
              onChange={(e) => setCostPaise(Math.round(Number(e.target.value) * 100))}
              className={inputCls}
            />
          </FormField>
        </div>
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-black text-xs shadow-md shadow-brand-600/20 transition-all"
        >
          Add Ingredient
        </button>
      </form>
    </Modal>
  );
};

export default AddInventoryModal;
