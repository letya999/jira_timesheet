import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterBar } from '@/components/shared/filter-bar';
import { 
  Collapsible, 
  CollapsibleContent 
} from '@/components/ui/collapsible';
import { FilterToggleButton } from '@/components/shared/filter-toggle-button';
import { CollapsibleBlock } from '@/components/shared/collapsible-block';
import { useReportFilters, type ReportFilters } from '../hooks/use-report-filters';
import {
  useCustomReport,
  useReportCategories,
  useReportSprints,
  useReportOrgUnits,
  useReportEmployees,
  useReportProjects,
} from '../hooks';
import { ReportFilterPanel } from '../components/report-filter-panel';
import { PivotConfigPanel } from '../components/pivot-config-panel';
import { ReportMetricsBar } from '../components/report-metrics-bar';
import { ReportDataTable } from '../components/report-data-table';
import { ReportChartPanel } from '../components/report-chart-panel';
import { ReportExportButton } from '../components/report-export-button';
import type { ReportRequest } from '../schemas';
import { useTranslation } from 'react-i18next';

type Row = Record<string, unknown>;

interface ReportBuilderPageProps {
  initialFilters?: Partial<ReportFilters>;
  lockedFields?: (keyof ReportFilters)[];
  title?: string;
}

export function ReportBuilderPage({
  initialFilters,
  lockedFields,
  title,
}: ReportBuilderPageProps) {
  const { t } = useTranslation();
  const { filters, setFilter, clearAll, toReportRequest, toFilterChips } = useReportFilters(initialFilters);
  const [reportBody, setReportBody] = useState<ReportRequest | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [isPivotConfigOpen, setIsPivotConfigOpen] = useState(true);

  // Pre-fetch label data for filter chips
  const { data: categories } = useReportCategories();
  const { data: sprints } = useReportSprints();
  const { data: orgUnits } = useReportOrgUnits();
  const { data: employees } = useReportEmployees();
  const { data: projects } = useReportProjects();

  const labelMaps = {
    projects: Object.fromEntries((projects ?? []).map((p) => [p.id, `${p.key} - ${p.name}`])),
    orgUnits: Object.fromEntries((orgUnits ?? []).map((u) => [u.id, u.name])),
    employees: Object.fromEntries((employees ?? []).map((e) => [e.id, e.display_name])),
    sprints: Object.fromEntries((sprints ?? []).map((s) => [s.id, s.name])),
    categories: Object.fromEntries((categories ?? []).map((c) => [c.id, c.name])),
  };

  const { data: reportData, isFetching, isError } = useCustomReport(reportBody);
  const rows: Row[] = (reportData?.data as Row[] | undefined) ?? [];

  const handleRun = useCallback(() => {
    setReportBody(toReportRequest());
  }, [toReportRequest]);

  const filterChips = toFilterChips(labelMaps);

  const handleRemoveChip = (id: string) => {
    if (id === 'date') { clearAll(); return; }
    if (id === 'project') setFilter('project_id', null);
    if (id === 'org_unit') setFilter('org_unit_id', null);
    if (id === 'types') setFilter('worklog_types', []);
    if (id === 'sprints') setFilter('sprint_ids', []);
    if (id === 'categories') setFilter('category_ids', []);
    if (id === 'users') setFilter('user_ids', []);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title ?? t('reports.title')}</h2>

      {/* Filter panel */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('web.reports.data_filters')}
          </h3>
          <FilterToggleButton
            isOpen={isFiltersOpen}
            showLabel={t('employees.show_filters', 'Show Filters')}
            hideLabel={t('employees.hide_filters', 'Hide Filters')}
            onClick={() => setIsFiltersOpen((prev) => !prev)}
          />
        </div>
        <CollapsibleContent className="rounded-md border p-4 bg-muted/20">
          <ReportFilterPanel
            filters={filters}
            onFilter={setFilter}
            lockedFields={lockedFields}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Pivot config */}
      <Collapsible open={isPivotConfigOpen} onOpenChange={setIsPivotConfigOpen} className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('web.reports.pivot_configuration')}
          </h3>
          <FilterToggleButton
            isOpen={isPivotConfigOpen}
            showLabel={t('web.reports.show_config', 'Show Configuration')}
            hideLabel={t('web.reports.hide_config', 'Hide Configuration')}
            onClick={() => setIsPivotConfigOpen((prev) => !prev)}
          />
        </div>
        <CollapsibleContent className="rounded-md border p-4 bg-muted/20">
          <PivotConfigPanel
            filters={filters}
            onFilter={setFilter}
            onRun={handleRun}
            isLoading={isFetching}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Active filter chips */}
      <FilterBar
        filters={filterChips}
        onRemove={handleRemoveChip}
        onClear={clearAll}
      />

      {/* Results */}
      {isFetching && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('web.reports.failed_load')}
        </div>
      )}

      {!isFetching && !isError && rows.length > 0 && (
        <div className="space-y-4">
          <CollapsibleBlock title={t('web.reports.aggregated_statistics')} defaultOpen>
            <ReportMetricsBar data={rows} format={filters.format} />
          </CollapsibleBlock>

          <Separator />

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('reports.data_table')}</CardTitle>
                <ReportExportButton
                  startDate={filters.start_date}
                  endDate={filters.end_date}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ReportDataTable
                data={rows}
                rowDimensions={filters.group_by_rows}
                columnDimensions={filters.group_by_cols}
                groupHorizontallyBy={filters.group_horizontally_by}
                groupVerticallyBy={filters.group_vertically_by}
                dateGranularity={filters.date_granularity}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('reports.chart_type')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ReportChartPanel
                data={rows}
                groupByRows={filters.group_by_rows}
                groupByCols={filters.group_by_cols}
                dateGranularity={filters.date_granularity}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {!isFetching && !isError && reportBody !== null && rows.length === 0 && (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          {t('reports.no_data')}
        </div>
      )}
    </div>
  );
}
