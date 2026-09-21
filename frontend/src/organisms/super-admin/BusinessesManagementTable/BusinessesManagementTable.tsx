import React from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import ResponsiveDataView from '@/molecules/ResponsiveDataView';
import EmptyState from '@/atoms/EmptyState';
import { formatCurrency } from '@/utils/money';
import { AdminBusinessSummary, SubscriptionPlan } from '@/types';

interface BusinessesManagementTableProps {
  businesses: AdminBusinessSummary[];
  plans: SubscriptionPlan[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenFinance: (businessId: string) => void;
  onOpenStatusModal: (business: { id: string; name: string; status: string }) => void;
  onChangePlan: (businessId: string, planId: string) => void;
}

const PlanSelect = ({
  business,
  plans,
  onChangePlan,
}: {
  business: AdminBusinessSummary;
  plans: SubscriptionPlan[];
  onChangePlan: (businessId: string, planId: string) => void;
}) => (
  <select
    value={business.currentPlan?._id || ''}
    onChange={(e) => e.target.value && onChangePlan(business._id, e.target.value)}
    className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
  >
    {!business.currentPlan && <option value="">No plan</option>}
    {plans.map((p) => (
      <option key={p._id} value={p._id} disabled={p.status === 'DISABLED' && p._id !== business.currentPlan?._id}>
        {p.name}
        {p.status === 'DISABLED' ? ' (disabled)' : ''}
      </option>
    ))}
  </select>
);

export const BusinessesManagementTable = ({ businesses, plans, searchQuery, onSearchChange, onOpenFinance, onOpenStatusModal, onChangePlan }: BusinessesManagementTableProps) => (
  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-extrabold text-slate-900">
          Registered Businesses Management
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          Detailed business status control, commission owed, and accounts overview
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search business by name or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
          />
        </div>
      </div>
    </div>

    <ResponsiveDataView
      data={businesses}
      keyExtractor={(r) => r._id}
      breakpoint="md"
      emptyState={
        <EmptyState
          title="No registered businesses match your filter"
          description="Try clearing search keywords or resetting the status filter."
          actionLabel="Reset Search Filter"
          onAction={() => onSearchChange('')}
        />
      }
      columns={[
        {
          header: 'Business Name',
          render: (r) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-100 to-rose-100 text-red-600 flex items-center justify-center font-black text-xs border border-red-200 shrink-0">
                {r.name.charAt(0)}
              </div>
              <div>
                <div className="font-extrabold text-slate-900">{r.name}</div>
                <div className="text-[10px] text-slate-400 font-normal">{r.address}</div>
              </div>
            </div>
          ),
        },
        { header: 'URL Slug', render: (r) => <span className="font-mono text-red-600 font-bold">/c/{r.slug}</span> },
        { header: 'Contact Email', render: (r) => <span className="font-medium text-slate-600">{r.email}</span> },
        {
          header: 'Plan',
          render: (r) => <PlanSelect business={r} plans={plans} onChangePlan={onChangePlan} />,
        },
        {
          header: 'Commission Owed',
          render: (r) => (
            <>
              <div className="font-extrabold text-slate-900">{formatCurrency(r.totalCommissionOwedPaise)}</div>
              {r.overdueAmountPaise > 0 && (
                <div className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {formatCurrency(r.overdueAmountPaise)} overdue
                </div>
              )}
            </>
          ),
        },
        {
          header: 'Status',
          render: (r) => (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap ${
              r.status === 'ACTIVE'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}>
              {r.status}
            </span>
          ),
        },
        {
          header: 'Actions',
          align: 'right',
          render: (r) => (
            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
              <button
                onClick={() => onOpenFinance(r._id)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                Finances
              </button>
              <button
                onClick={() => onOpenStatusModal({ id: r._id, name: r.name, status: r.status })}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                  r.status === 'ACTIVE'
                    ? 'bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {r.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
              </button>
            </div>
          ),
        },
      ]}
      renderCard={(r) => (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-100 to-rose-100 text-red-600 flex items-center justify-center font-black text-xs border border-red-200 shrink-0">
                {r.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900 truncate">{r.name}</div>
                <div className="text-[10px] font-mono text-red-600 font-bold">/c/{r.slug}</div>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap shrink-0 ${
              r.status === 'ACTIVE'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}>
              {r.status}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">{r.email}</div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Plan</div>
            <PlanSelect business={r} plans={plans} onChangePlan={onChangePlan} />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Commission Owed</div>
              <div className="font-extrabold text-slate-900 text-sm">{formatCurrency(r.totalCommissionOwedPaise)}</div>
            </div>
            {r.overdueAmountPaise > 0 && (
              <div className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {formatCurrency(r.overdueAmountPaise)} overdue
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onOpenFinance(r._id)}
              className="flex-1 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Finances
            </button>
            <button
              onClick={() => onOpenStatusModal({ id: r._id, name: r.name, status: r.status })}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                r.status === 'ACTIVE'
                  ? 'bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {r.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
            </button>
          </div>
        </div>
      )}
    />
  </div>
);

export default BusinessesManagementTable;
