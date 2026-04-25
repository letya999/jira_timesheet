import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Play } from 'lucide-react';
import type { ReportFilters, DateGranularity, ValueFormat } from '../hooks/use-report-filters';
import { useTranslation } from 'react-i18next';

interface PivotConfigPanelProps {
  filters: ReportFilters;
  onFilter: <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => void;
  onRun: () => void;
  isLoading?: boolean;
}

export function PivotConfigPanel({ filters, onFilter, onRun, isLoading }: PivotConfigPanelProps) {
  const { t } = useTranslation();

  const PIVOT_DIMENSIONS = [
    { label: t('common.user'), value: 'user' },
    { label: t('common.project'), value: 'project' },
    { label: t('common.release'), value: 'release' },
    { label: t('common.sprint'), value: 'sprint' },
    { label: t('common.team'), value: 'team' },
    { label: t('common.division'), value: 'division' },
    { label: t('common.department'), value: 'department' },
    { label: t('common.date'), value: 'date' },
    { label: t('common.category'), value: 'category' },
    { label: t('common.type'), value: 'type' },
    { label: t('web.reports.dimensions.issue_link'), value: 'issue_link' },
    { label: t('web.reports.dimensions.issue_name'), value: 'issue_name' },
    { label: t('web.reports.dimensions.issue_type'), value: 'issue_type' },
    { label: t('web.reports.dimensions.labels'), value: 'labels' },
  ];
  const GROUP_DIMENSIONS = PIVOT_DIMENSIONS.filter((d) => d.value !== 'labels');

  const GRANULARITY_OPTIONS: { label: string; value: DateGranularity }[] = [
    { label: t('org.period_day'), value: 'day' },
    { label: t('org.period_week'), value: 'week' },
    { label: t('org.period_2weeks'), value: '2weeks' },
    { label: t('org.period_month'), value: 'month' },
    { label: t('org.period_quarter'), value: 'quarter' },
  ];

  const overlap = filters.group_by_rows.filter((r) => filters.group_by_cols.includes(r));
  const directionConflict =
    !!filters.group_horizontally_by
    && !!filters.group_vertically_by
    && filters.group_horizontally_by === filters.group_vertically_by;
  const hasError = filters.group_by_rows.length === 0 || overlap.length > 0 || directionConflict;

  const showGranularity =
    filters.group_by_rows.includes('date') || filters.group_by_cols.includes('date');

  const rowOptions = PIVOT_DIMENSIONS.filter((d) => !filters.group_by_cols.includes(d.value));
  const colOptions = PIVOT_DIMENSIONS.filter((d) => !filters.group_by_rows.includes(d.value));
  const horizontalOptions = GROUP_DIMENSIONS;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      {/* Dimensions */}
      <div className="space-y-3">
        <div>
          <Label className="mb-1.5 block text-sm">{t('reports.rows_vertical')}</Label>
          <MultiSelect
            options={rowOptions}
            selected={filters.group_by_rows}
            onChange={(vals) => onFilter('group_by_rows', vals)}
            placeholder={t('web.reports.select_row_dimensions')}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">{t('reports.cols_horizontal')}</Label>
          <MultiSelect
            options={colOptions}
            selected={filters.group_by_cols}
            onChange={(vals) => onFilter('group_by_cols', vals)}
            placeholder={t('web.reports.none_flat_table')}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">{t('web.reports.group_horizontally_by')}</Label>
          <Combobox
            options={[{ label: t('web.reports.none'), value: '' }, ...horizontalOptions]}
            value={filters.group_horizontally_by ?? ''}
            onChange={(val) => onFilter('group_horizontally_by', val || null)}
            placeholder={t('web.reports.none')}
            className="w-full"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">{t('web.reports.group_vertically_by')}</Label>
          <Combobox
            options={[{ label: t('web.reports.none'), value: '' }, ...horizontalOptions]}
            value={filters.group_vertically_by ?? ''}
            onChange={(val) => onFilter('group_vertically_by', val || null)}
            placeholder={t('web.reports.none')}
            className="w-full"
          />
        </div>
        {overlap.length > 0 && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="size-3" />
            {t('web.reports.dimension_conflict')}: {overlap.join(', ')}
          </p>
        )}
        {filters.group_by_rows.length === 0 && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="size-3" />
            {t('web.reports.one_row_required')}
          </p>
        )}
        {directionConflict && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="size-3" />
            {t('web.reports.horizontal_vertical_conflict')}
          </p>
        )}
      </div>

      {/* Value format + granularity */}
      <div className="space-y-3">
        <div>
          <Label className="mb-2 block text-sm">{t('reports.value_unit')}</Label>
          <RadioGroup
            value={filters.format}
            onValueChange={(val) => onFilter('format', val as ValueFormat)}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="hours" id="fmt-hours" />
              <Label htmlFor="fmt-hours" className="cursor-pointer">{t('common.hours')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="days" id="fmt-days" />
              <Label htmlFor="fmt-days" className="cursor-pointer">{t('common.days')}</Label>
            </div>
          </RadioGroup>
        </div>

        {filters.format === 'days' && (
          <div>
            <Label htmlFor="hours-per-day" className="mb-1.5 block text-sm">{t('reports.hours_per_day')}</Label>
            <Input
              id="hours-per-day"
              type="number"
              min={1}
              max={24}
              value={filters.hours_per_day}
              onChange={(e) => onFilter('hours_per_day', Number(e.target.value))}
              className="w-32"
            />
          </div>
        )}

        {showGranularity && (
          <div>
            <Label className="mb-2 block text-sm">{t('reports.date_granularity')}</Label>
            <div className="flex flex-wrap gap-1">
              {GRANULARITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onFilter('date_granularity', opt.value)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-md border transition-colors',
                    filters.date_granularity === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Run button */}
      <div className="flex items-end h-full">
        <Button
          onClick={onRun}
          disabled={hasError || isLoading}
          className="w-full"
          size="lg"
        >
          <Play className="size-4 mr-2" />
          {isLoading ? t('common.loading') : t('reports.run_report')}
        </Button>
      </div>
    </div>
  );
}
