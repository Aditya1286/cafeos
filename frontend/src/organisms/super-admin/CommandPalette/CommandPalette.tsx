import React, { useState, useEffect } from 'react';
import { Search, X, Coffee, ShoppingBag, Users, Store, ArrowRight, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_NAME } from '@/constants/app';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: string, id: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const mockResults = [
    {
      type: 'Orders',
      id: 'ORD-8924',
      label: 'Order #ORD-8924 (Table 4) - ₹640',
      icon: ShoppingBag,
      category: 'Active Orders',
    },
    {
      type: 'Orders',
      id: 'ORD-8921',
      label: 'Order #ORD-8921 (Table 12) - ₹1,250',
      icon: ShoppingBag,
      category: 'Active Orders',
    },
    {
      type: 'Products',
      id: 'PROD-101',
      label: 'Iced Artisan Latte - Specialty Coffee',
      icon: Coffee,
      category: 'Products',
    },
    {
      type: 'Products',
      id: 'PROD-104',
      label: 'Sourdough Avocado Toast - Bakery',
      icon: Coffee,
      category: 'Products',
    },
    {
      type: 'Businesses',
      id: 'BUSINESS-1',
      label: 'The Artisan Roastery (Bandra)',
      icon: Store,
      category: 'Businesses',
    },
    {
      type: 'Businesses',
      id: 'BUSINESS-2',
      label: 'Bean & Butter Bakery (Indiranagar)',
      icon: Store,
      category: 'Businesses',
    },
    {
      type: 'Customers',
      id: 'CUST-001',
      label: 'Priya Sharma (VIP · 14 orders)',
      icon: Users,
      category: 'Customers',
    },
  ];

  const filtered = mockResults.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
          style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search orders, products, customers, businesses... (⌘K)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 outline-none"
              />
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 text-xs font-bold transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results Section */}
            <div className="max-h-96 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No matching orders, products, or businesses found for "{query}"
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelect(item.type, item.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors group border border-transparent hover:border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{item.label}</div>
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              {item.category}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono text-[10px]">
                  ↑↓
                </span>{' '}
                to navigate
                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono text-[10px]">
                  ESC
                </span>{' '}
                to close
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-red-500" /> {APP_NAME} Command
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
