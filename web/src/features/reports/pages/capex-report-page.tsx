import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ReportSummaryCard } from '@/components/shared/report-summary-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCapexReport } from '../hooks';
import { ReportBuilderPage } from './report-builder-page';

type DashboardRow = {
  Hours?: number;
  Type?: string;
};

function computeSummary(data: DashboardRow[]) {
  const total = data.reduce((s, r) => s + (r.Hours ?? 0), 0);
  const capex = data.filter((r) => r.Type === 'JIRA').reduce((s, r) => s + (r.Hours ?? 0), 0);
  return { total, capex, opex: total - capex };
}

export function CapexReportPage() {
  const now = new Date();
  const params = {
    start_date: format(startOfMonth(now), 'yyyy-MM-dd'),
    end_date: format(endOfMonth(now), 'yyyy-MM-dd'),
  };

  const { data, isLoading } = useCapexReport(params);
  const rows = (data?.data as DashboardRow[] | undefined) ?? [];
  const summary = computeSummary(rows);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <Skeleton className="h-28 w-full max-w-sm" />
      ) : (
        <ReportSummaryCard
          title="CapEx — current month"
          period={`${params.start_date} — ${params.end_date}`}
          totalHours={summary.total}
          capexHours={summary.capex}
          opexHours={summary.opex}
          className="max-w-sm"
        />
      )}

      <ReportBuilderPage
        title="CapEx Report"
        initialFilters={{
          start_date: params.start_date,
          end_date: params.end_date,
          worklog_types: ['JIRA'],
          group_by_rows: ['user', 'project'],
          group_by_cols: ['date'],
        }}
      />
    </div>
  );
}
