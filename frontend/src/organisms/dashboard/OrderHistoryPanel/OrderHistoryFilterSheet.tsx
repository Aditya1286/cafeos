import { useState } from 'react';
import { BottomSheet } from '@/molecules/MobileList';
import { OrderHistoryPanelProps } from './OrderHistoryPanel';
import { DATE_CHOICES, FilterChoice, METHOD_CHOICES, PAYMENT_CHOICES } from './filterOptions';

interface OrderHistoryFilterSheetProps {
  filters: OrderHistoryPanelProps['filters'];
  onClose: () => void;
}

const selectCls =
  'w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-brand-500';

const Field = ({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string;
  choices: FilterChoice[];
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block">
      {label}
    </label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      {choices.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </select>
  </div>
);

/** A sheet from the bottom with the filters that are not on the row of pills. Nothing is applied
 * (and nothing is fetched) until "Show orders", so changing three dropdowns is one search. */
export const OrderHistoryFilterSheet = ({ filters, onClose }: OrderHistoryFilterSheetProps) => {
  const [payment, setPayment] = useState(filters.selectedPaymentFilter);
  const [method, setMethod] = useState(filters.selectedMethodFilter);
  const [date, setDate] = useState<string>(filters.selectedDateFilter);

  const apply = () => {
    filters.setSelectedPaymentFilter(payment);
    filters.setSelectedMethodFilter(method);
    filters.setSelectedDateFilter(date as typeof filters.selectedDateFilter);
    onClose();
  };
  const clear = () => {
    setPayment('ALL');
    setMethod('ALL');
    setDate('ALL');
  };

  return (
    <BottomSheet
      title="Filter orders"
      onClose={onClose}
      footer={
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={clear}
            className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={apply}
            className="col-span-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black"
          >
            Show orders
          </button>
        </div>
      }
    >
      <Field label="Date" value={date} choices={DATE_CHOICES} onChange={setDate} />
      <Field
        label="Payment status"
        value={payment}
        choices={PAYMENT_CHOICES}
        onChange={setPayment}
      />
      <Field label="Payment method" value={method} choices={METHOD_CHOICES} onChange={setMethod} />
    </BottomSheet>
  );
};
