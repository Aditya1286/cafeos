import React from 'react';
import { Modal } from '@/molecules/Modal';
import { FormField, inputCls } from '@/molecules/FormField';

interface AddTableModalProps {
  open: boolean;
  onClose: () => void;
  tableNumber: string;
  setTableNumber: (v: string) => void;
  capacity: number;
  setCapacity: (v: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AddTableModal = ({
  open,
  onClose,
  tableNumber,
  setTableNumber,
  capacity,
  setCapacity,
  onSubmit,
}: AddTableModalProps) => {
  if (!open) return null;

  return (
    <Modal title="Add Table" onClose={onClose} maxWidth="max-w-sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Table Number / Name">
          <input
            type="text"
            required
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="e.g. Table 12"
            className={inputCls}
          />
        </FormField>
        <FormField label="Seating Capacity">
          <input
            type="number"
            required
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className={inputCls}
          />
        </FormField>
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-black text-xs shadow-md shadow-brand-600/20 transition-all"
        >
          Create Table & QR Code
        </button>
      </form>
    </Modal>
  );
};

export default AddTableModal;
