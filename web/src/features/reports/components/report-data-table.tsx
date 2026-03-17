import { useMemo, useState } from 'react';
import type { DateGranularity } from '../hooks/use-report-filters';
import { buildPivotTableModel } from '../utils/pivot-table';
import { PivotTable } from '@/components/shared/pivot-table';
import { useTranslation } from 'react-i18next';

type Row = Record<string, unknown>;

interface ReportDataTableProps {
  data: Row[];
  rowDimensions: string[];
  columnDimensions: string[];
  groupHorizontallyBy: string | null;
  groupVerticallyBy: string | null;
  dateGranularity: DateGranularity;
}

export function ReportDataTable({
  data,
  rowDimensions,
  columnDimensions,
  groupHorizontallyBy,
  groupVerticallyBy,
  dateGranularity,
}: ReportDataTableProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const model = useMemo(
    () =>
      buildPivotTableModel({
        data,
        rowDimensions,
        columnDimensions,
        groupHorizontallyBy,
        groupVerticallyBy,
        dateGranularity,
      }),
    [columnDimensions, data, dateGranularity, groupHorizontallyBy, groupVerticallyBy, rowDimensions]
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        {t('common.not_found')}
      </div>
    );
  }

  return (
    <div
      className="space-y-2"
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      <PivotTable
        model={model}
        maxHeight={isFocused ? 'calc(100vh - 15rem)' : '28rem'}
        showTotals={true}
        renderRowValue={(value, dimension) => {
          if (dimension === 'issue_link' && value !== 'N/A') {
            const issueKey = value.split('/').pop() ?? value;
            return (
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                {issueKey}
              </a>
            );
          }
          return <span className="font-medium">{value}</span>;
        }}
      />
    </div>
  );
}
