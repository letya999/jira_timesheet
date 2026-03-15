import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart2, TrendingUp, PieChart as PieIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import type { DateGranularity } from '../hooks/use-report-filters';

type Row = Record<string, unknown>;

type ChartType = 'bar' | 'line' | 'pie';

const CHART_COLORS = [
  'hsl(var(--chart-1, 220 70% 50%))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
];

interface ReportChartPanelProps {
  data: Row[];
  groupByRows: string[];
  groupByCols: string[];
  dateGranularity: DateGranularity;
}

export function ReportChartPanel({
  data,
  groupByRows,
  groupByCols,
  dateGranularity,
}: ReportChartPanelProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [colorBy, setColorBy] = useState<string>(groupByRows[0] ?? '');

  const allDimensions = [...groupByRows, ...groupByCols].filter(Boolean);

  const colorByOptions = allDimensions.map((d) => ({
    label: d.charAt(0).toUpperCase() + d.slice(1),
    value: d,
  }));

  // Effective color dimension — default to first row dim
  const effectiveColorBy = colorBy || groupByRows[0] || allDimensions[0] || '';
  const xField = groupByRows[0] ?? allDimensions[0] ?? '';

  // For line charts, prefer the date granularity column
  const dateCol = dateGranularity;
  const hasDateCol = allDimensions.includes('date');

  // Aggregate data by xField + colorBy
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    if (chartType === 'pie') {
      const totals: Record<string, number> = {};
      for (const row of data) {
        const key = String(row[xField] ?? 'Unknown');
        totals[key] = (totals[key] ?? 0) + (typeof row.value === 'number' ? row.value : 0);
      }
      return Object.entries(totals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 20);
    }

    if (chartType === 'line' && hasDateCol) {
      // Group by (date granularity column, colorBy)
      const timeField = dateCol;
      const series: Record<string, Record<string, number>> = {};
      const timeKeys = new Set<string>();

      for (const row of data) {
        const timeKey = String(row[timeField] ?? row.date ?? '');
        const colorKey = String(row[effectiveColorBy] ?? 'Total');
        if (!timeKey || timeKey === 'undefined') continue;
        
        timeKeys.add(timeKey);
        if (!series[colorKey]) series[colorKey] = {};
        series[colorKey][timeKey] = (series[colorKey][timeKey] ?? 0) +
          (typeof row.value === 'number' ? row.value : 0);
      }

      return Array.from(timeKeys)
        .sort()
        .map((t) => {
          const point: Record<string, unknown> = { date: t };
          for (const [key, vals] of Object.entries(series)) {
            point[key] = vals[t] ?? 0;
          }
          return point;
        });
    }

    // Bar: aggregate by xField, color by colorBy
    const grouped: Record<string, Record<string, number>> = {};
    const colorKeysSet = new Set<string>();

    for (const row of data) {
      const xKey = String(row[xField] ?? 'Unknown');
      const cKey = String(row[effectiveColorBy] ?? 'Total');
      colorKeysSet.add(cKey);
      if (!grouped[xKey]) grouped[xKey] = {};
      grouped[xKey][cKey] = (grouped[xKey][cKey] ?? 0) +
        (typeof row.value === 'number' ? row.value : 0);
    }

    return Object.entries(grouped)
      .map(([name, vals]) => ({ name, ...vals }))
      .sort((a, b) => {
        const aTotal = Object.values(a).filter((v) => typeof v === 'number').reduce((s, v) => s + (v as number), 0);
        const bTotal = Object.values(b).filter((v) => typeof v === 'number').reduce((s, v) => s + (v as number), 0);
        return bTotal - aTotal;
      })
      .slice(0, 30);
  }, [data, chartType, xField, effectiveColorBy, hasDateCol, dateCol]);

  const colorKeys = useMemo(() => {
    if (chartType === 'pie' || data.length === 0) return [];
    const keys = new Set<string>();
    for (const row of data) {
      keys.add(String(row[effectiveColorBy] ?? 'Total'));
    }
    return Array.from(keys).slice(0, 10);
  }, [data, effectiveColorBy, chartType]);

  const CHART_ICONS = [
    { type: 'bar' as ChartType, icon: BarChart2, label: 'Bar' },
    { type: 'line' as ChartType, icon: TrendingUp, label: 'Line' },
    { type: 'pie' as ChartType, icon: PieIcon, label: 'Pie' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1">
          {CHART_ICONS.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              type="button"
              title={label}
              onClick={() => setChartType(type)}
              className={cn(
                'p-2 rounded-md border transition-colors',
                chartType === type
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground'
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>

        {chartType !== 'pie' && colorByOptions.length > 1 && (
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Color by</Label>
            <Combobox
              options={colorByOptions}
              value={effectiveColorBy}
              onChange={(val) => setColorBy(val)}
              className="w-36"
            />
          </div>
        )}

        {chartType === 'line' && !hasDateCol && (
          <p className="text-xs text-muted-foreground">
            Add &quot;Date&quot; to row or column dimensions for a line chart.
          </p>
        )}
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {colorKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </BarChart>
          ) : chartType === 'line' && hasDateCol ? (
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {colorKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  dot={false}
                />
              ))}
            </LineChart>
          ) : (
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) =>
                  `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
