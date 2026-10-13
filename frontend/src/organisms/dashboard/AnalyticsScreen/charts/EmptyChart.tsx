import React from 'react';
import { BarChart3 } from 'lucide-react';

export const EmptyChart: React.FC<{ message?: string }> = ({
  message = 'Nothing to show for these filters',
}) => (
  <div className="flex h-full min-h-0 flex-col items-center justify-center gap-1 text-center">
    <BarChart3 className="h-5 w-5 text-slate-300" aria-hidden="true" />
    <p className="text-xs font-medium text-slate-400">{message}</p>
  </div>
);
