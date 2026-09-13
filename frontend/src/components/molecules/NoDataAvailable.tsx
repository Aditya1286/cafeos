import React from 'react';
import { BarChart3 } from 'lucide-react';

interface NoDataAvailableProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  message?: string;
  className?: string;
}

// Shared empty state for any data-driven panel (a chart, a table, a report)
// that has nothing to show yet. Renders in place of the real content instead
// of falling back to fabricated/mock numbers.
export const NoDataAvailable: React.FC<NoDataAvailableProps> = ({
  icon: Icon = BarChart3,
  title = 'No data available',
  message = 'Once there\'s activity to report, it will show up here.',
  className = '',
}) => (
  <div className={`p-12 text-center space-y-3 ${className}`}>
    <Icon className="w-12 h-12 text-slate-300 mx-auto" />
    <h3 className="text-base font-black text-slate-800">{title}</h3>
    <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto">{message}</p>
  </div>
);

export default NoDataAvailable;
