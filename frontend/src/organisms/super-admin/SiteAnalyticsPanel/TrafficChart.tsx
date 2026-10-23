import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { SiteReport } from '@/services/superAdmin/siteAnalytics/types';
import { Card, Empty } from './parts';

// Recharts writes colours into SVG attributes, where CSS variables don't resolve: the CAOS red, literally.
const BRAND = '#DC2626';

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export const TrafficChart: React.FC<{ daily: SiteReport['daily'] }> = ({ daily }) => (
  <Card
    title="Visitors and leads per day"
    sub="The line is people visiting; the bars are demo requests"
  >
    {daily.some((d) => d.pageviews > 0 || d.leads > 0) ? (
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={daily} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 10 }}
              minTickGap={16}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip labelFormatter={(d) => shortDate(String(d))} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
            <Area
              type="monotone"
              dataKey="visitors"
              name="Visitors"
              stroke="#94a3b8"
              fill="#f1f5f9"
              strokeWidth={2}
            />
            <Bar
              dataKey="leads"
              name="Demo requests"
              fill={BRAND}
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <Empty text="No visits in this period yet." />
    )}
  </Card>
);
