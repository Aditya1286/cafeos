import React from 'react';
import { Store } from 'lucide-react';
import CardHoverEffect, { HoverEffectItem } from '../../ui/CardHoverEffect';
import { AdminBusinessSummary } from '../../../types';

interface BusinessesShowcaseProps {
  businesses: AdminBusinessSummary[];
  onSelectBusiness: (business: { id: string; name: string; status: string }) => void;
}

export const BusinessesShowcase = ({ businesses, onSelectBusiness }: BusinessesShowcaseProps) => {
  const items: HoverEffectItem[] = businesses.map((r) => ({
    title: r.name,
    description: `Slug: /c/${r.slug} · Email: ${r.email}`,
    badge: r.status,
    metric: `${r.commissionRatePercentage ?? 3}% commission`,
    icon: <Store className="w-5 h-5 text-red-500" />,
    onClick: () => onSelectBusiness({ id: r._id, name: r.name, status: r.status }),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">
            Active Businesses Showcase
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Interactive hover grid for registered business operations
          </p>
        </div>
      </div>
      <CardHoverEffect items={items} />
    </div>
  );
};

export default BusinessesShowcase;
