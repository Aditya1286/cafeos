import React from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../molecules/Modal';

interface DeleteProductModalProps {
  product: any | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteProductModal = ({ product, deleting, onClose, onConfirm }: DeleteProductModalProps) => {
  if (!product) return null;

  return (
    <Modal title="Delete this item?" onClose={() => !deleting && onClose()} maxWidth="max-w-sm">
      <div className="space-y-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-800">
            Delete <span className="text-rose-600">{product.name}</span> from your menu?
          </p>
          <p className="text-xs text-slate-500 font-medium">
            It disappears from this list and the customer menu right away — unlike "Remove from menu," there's no
            restore button for this here. Its record and past order history are kept, not erased.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteProductModal;
