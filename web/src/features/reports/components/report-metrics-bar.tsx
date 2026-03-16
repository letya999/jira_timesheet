import { Clock, Users, CheckSquare, TrendingUp } from 'lucide-react';
import { StatItem } from '@/components/ui/stat-item';
import { useTranslation } from 'react-i18next';

type Row = Record<string, unknown>;

interface ReportMetricsBarProps {
  data: Row[];
  format: 'hours' | 'days';
}

function sumField(data: Row[], field: string): number {
  return data.reduce((acc, row) => {
    const val = row[field];
    return acc + (typeof val === 'number' ? val : 0);
  }, 0);
}

function countUnique(data: Row[], field: string): number {
  return new Set(data.map((r) => r[field])).size;
}

export function ReportMetricsBar({ data, format }: ReportMetricsBarProps) {
  const { t } = useTranslation();
  const totalValue = sumField(data, 'value');
  const totalHours = sumField(data, 'hours');
  const uniqueEmployees = countUnique(data, 'user');
  const uniqueTasks = countUnique(data, 'task');

  const unit = format === 'days' ? 'd' : 'h';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatItem
        label={t('reports.grand_total')}
        value={`${totalValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit}`}
        icon={<TrendingUp className="size-4" />}
      />
      <StatItem
        label={t('reports.total_hours')}
        value={`${totalHours.toLocaleString(undefined, { maximumFractionDigits: 1 })}h`}
        icon={<Clock className="size-4" />}
      />
      <StatItem
        label={t('common.employees')}
        value={uniqueEmployees}
        icon={<Users className="size-4" />}
      />
      <StatItem
        label={t('web.reports.unique_tasks')}
        value={uniqueTasks}
        icon={<CheckSquare className="size-4" />}
      />
    </div>
  );
}
