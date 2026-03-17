import { format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { canAccessManagerPages } from '@/lib/rbac';
import {
  useReportCategories,
  useReportSprints,
  useReportOrgUnits,
  useReportEmployees,
  useReportProjects,
  useProjectReleases,
} from '../hooks';
import type { ReportFilters } from '../hooks/use-report-filters';
import { useTranslation } from 'react-i18next';

interface ReportFilterPanelProps {
  filters: ReportFilters;
  onFilter: <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => void;
  lockedFields?: (keyof ReportFilters)[];
}

export function ReportFilterPanel({ filters, onFilter, lockedFields = [] }: ReportFilterPanelProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const userRole = useAuthStore((s) => (s.user as { role?: string } | null)?.role);
  const isManager = canAccessManagerPages(userRole);

  const { data: categories, isLoading: loadingCats } = useReportCategories();
  const { data: sprints, isLoading: loadingSprints } = useReportSprints();
  const { data: orgUnits, isLoading: loadingUnits } = useReportOrgUnits();
  const { data: employees, isLoading: loadingEmps } = useReportEmployees();
  const { data: projects, isLoading: loadingProjects } = useReportProjects();
  const { data: releases, isLoading: loadingReleases } = useProjectReleases(filters.project_id);

  const isLocked = (key: keyof ReportFilters) => lockedFields.includes(key);

  const handleDateRange = (range: DateRange | undefined) => {
    if (range?.from) {
      onFilter('start_date', format(range.from, 'yyyy-MM-dd'));
    }
    if (range?.to) {
      onFilter('end_date', format(range.to, 'yyyy-MM-dd'));
    }
  };

  const dateRange: DateRange = {
    from: parseISO(filters.start_date),
    to: parseISO(filters.end_date),
  };

  const projectOptions = (projects ?? []).map((p) => ({
    label: `${p.key} - ${p.name}`,
    value: String(p.id),
  }));

  const releaseOptions = (releases ?? []).map((r) => ({
    label: r.name,
    value: String(r.id),
  }));

  const categoryOptions = (categories ?? []).map((c) => ({
    label: c.name,
    value: String(c.id),
  }));

  const sprintOptions = (sprints ?? []).map((s) => ({
    label: s.name,
    value: String(s.id),
  }));

  const orgUnitOptions = (orgUnits ?? []).map((u) => ({
    label: u.name,
    value: String(u.id),
  }));

  const employeeOptions = (employees ?? []).map((e) => ({
    label: e.display_name,
    value: String(e.id),
  }));

  const worklogTypeOptions = [
    { label: t('web.reports.worklog_type_jira'), value: 'JIRA' },
    { label: t('web.reports.worklog_type_manual'), value: 'MANUAL' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-3">
        <div>
          <Label className="mb-1.5 block text-sm">{t('web.reports.date_range')}</Label>
          <DateRangePicker
            date={dateRange}
            setDate={handleDateRange}
            className="w-full"
            disabled={isLocked('start_date')}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">{t('common.categories')}</Label>
          {loadingCats ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <MultiSelect
              options={categoryOptions}
              selected={filters.category_ids.map(String)}
              onChange={(vals) => onFilter('category_ids', vals.map(Number))}
              placeholder={t('web.reports.all_categories')}
              disabled={isLocked('category_ids')}
            />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="mb-1.5 block text-sm">{t('common.project')}</Label>
          {loadingProjects ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Combobox
              options={[{ label: t('journal.all_projects'), value: '' }, ...projectOptions]}
              value={filters.project_id !== null ? String(filters.project_id) : ''}
              onChange={(val) => {
                onFilter('project_id', val ? Number(val) : null);
                onFilter('release_id', null);
              }}
              placeholder={t('journal.all_projects')}
              className="w-full"
              disabled={isLocked('project_id')}
            />
          )}
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">{t('common.release')}</Label>
          {filters.project_id !== null ? (
            loadingReleases ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Combobox
                options={[{ label: t('reports.all_releases'), value: '' }, ...releaseOptions]}
                value={filters.release_id !== null ? String(filters.release_id) : ''}
                onChange={(val) => onFilter('release_id', val ? Number(val) : null)}
                placeholder={t('reports.all_releases')}
                className="w-full"
              />
            )
          ) : (
            <div className="h-10 items-center border rounded-md px-3 bg-muted/30 text-[13px] text-muted-foreground italic flex">
              {t('reports.select_project_hint')}
            </div>
          )}
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">{t('common.sprint')}</Label>
          {loadingSprints ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <MultiSelect
              options={sprintOptions}
              selected={filters.sprint_ids.map(String)}
              onChange={(vals) => onFilter('sprint_ids', vals.map(Number))}
              placeholder={t('web.reports.all_sprints')}
              disabled={isLocked('sprint_ids')}
            />
          )}
        </div>
      </div>

      <div className="space-y-3">
        {isManager ? (
          <div>
            <Label className="mb-1.5 block text-sm">{t('common.team')}</Label>
            {loadingUnits ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Combobox
                options={[{ label: t('journal.all_teams'), value: '' }, ...orgUnitOptions]}
                value={filters.org_unit_id !== null ? String(filters.org_unit_id) : ''}
                onChange={(val) => onFilter('org_unit_id', val ? Number(val) : null)}
                placeholder={t('journal.all_teams')}
                className="w-full"
                disabled={isLocked('org_unit_id')}
              />
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-sm">{t('common.team')}</Label>
            <div className="h-10 items-center border rounded-md px-3 bg-muted/50 text-[13px] text-muted-foreground flex">
              {t('web.reports.filtered_team')}
            </div>
          </div>
        )}
        <div>
          <Label className="mb-1.5 block text-sm">{t('reports.worklog_types')}</Label>
          <MultiSelect
            options={worklogTypeOptions}
            selected={filters.worklog_types}
            onChange={(vals) => onFilter('worklog_types', vals as ('JIRA' | 'MANUAL')[])}
            placeholder={t('web.reports.all_types')}
            disabled={isLocked('worklog_types')}
          />
        </div>
      </div>

      <div className="space-y-3">
        {isManager ? (
          <div>
            <Label className="mb-1.5 block text-sm">{t('common.employees')}</Label>
            {loadingEmps ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <MultiSelect
                options={employeeOptions}
                selected={filters.user_ids.map(String)}
                onChange={(vals) => onFilter('user_ids', vals.map(Number))}
                placeholder={t('web.reports.all_employees')}
                disabled={isLocked('user_ids')}
              />
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-sm">{t('common.employee')}</Label>
            <div className="h-10 items-center border rounded-md px-3 bg-muted/50 text-[13px] font-medium flex">
              {user?.display_name || t('common.loading')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
