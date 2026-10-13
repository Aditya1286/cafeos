// Series colours for the analytics charts. Grid lines, axis labels and tooltips are themed by
// styles/dashboardTheme.css (it restyles recharts in dark mode), so only the data colours live here.
export const CHART_COLORS = ['#f97316', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#64748b'];

export const colorAt = (index: number): string => CHART_COLORS[index % CHART_COLORS.length];
