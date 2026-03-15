import { format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import {
  useReportCategories,
  useReportSprints,
  useReportOrgUnits,
  useReportEmployees,
  useReportProjects,
  useProjectReleases,
} from '../hooks';
import type { ReportFilters } from '../hooks/use-report-filters';

interface ReportFilterPanelProps {
  filters: ReportFilters;
  onFilter: <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => void;
  lockedFields?: (keyof ReportFilters)[];
}

const WORKLOG_TYPE_OPTIONS = [
  { label: 'Jira', value: 'JIRA' },
  { label: 'Manual', value: 'MANUAL' },
];

export function ReportFilterPanel({ filters, onFilter, lockedFields = [] }: ReportFilterPanelProps) {
  const { user, permissions } = useAuthStore();
  // RBAC: Admin, CEO, PM roles have reports.manage permission (or similar)
  // Matching Streamlit check: user_role in ["Admin", "CEO", "PM"]
  const isManager = user?.is_admin || permissions.includes('reports.manage') || permissions.includes('org.view');

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Col 1: Date + Categories */}
      <div className="space-y-3">
        <div>
          <Label className="mb-1.5 block text-sm">Date range</Label>
          <DateRangePicker
            date={dateRange}
            setDate={handleDateRange}
            className="w-full"
            disabled={isLocked('start_date')}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Categories</Label>
          {loadingCats ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <MultiSelect
              options={categoryOptions}
              selected={filters.category_ids.map(String)}
              onChange={(vals) => onFilter('category_ids', vals.map(Number))}
              placeholder="All categories"
              disabled={isLocked('category_ids')}
            />
          )}
        </div>
      </div>

      {/* Col 2: Project → Release + Sprints */}
      <div className="space-y-3">
        <div>
          <Label className="mb-1.5 block text-sm">Project</Label>
          {loadingProjects ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Combobox
              options={[{ label: 'All projects', value: '' }, ...projectOptions]}
              value={filters.project_id !== null ? String(filters.project_id) : ''}
              onChange={(val) => {
                onFilter('project_id', val ? Number(val) : null);
                onFilter('release_id', null);
              }}
              placeholder="All projects"
              className="w-full"
              disabled={isLocked('project_id')}
            />
          )}
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Release</Label>
          {filters.project_id !== null ? (
            loadingReleases ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Combobox
                options={[{ label: 'All releases', value: '' }, ...releaseOptions]}
                value={filters.release_id !== null ? String(filters.release_id) : ''}
                onChange={(val) => onFilter('release_id', val ? Number(val) : null)}
                placeholder="All releases"
                className="w-full"
              />
            )
          ) : (
            <div className="text-[13px] text-muted-foreground italic h-10 flex items-center border rounded-md px-3 bg-muted/30">
              Select a project to filter releases
            </div>
          )}
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Sprints</Label>
          {loadingSprints ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <MultiSelect
              options={sprintOptions}
              selected={filters.sprint_ids.map(String)}
              onChange={(vals) => onFilter('sprint_ids', vals.map(Number))}
              placeholder="All sprints"
              disabled={isLocked('sprint_ids')}
            />
          )}
        </div>
      </div>

      {/* Col 3: Team (manager only) + Worklog type */}
      <div className="space-y-3">
        {isManager ? (
          <div>
            <Label className="mb-1.5 block text-sm">Team</Label>
            {loadingUnits ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Combobox
                options={[{ label: 'All teams', value: '' }, ...orgUnitOptions]}
                value={filters.org_unit_id !== null ? String(filters.org_unit_id) : ''}
                onChange={(val) => onFilter('org_unit_id', val ? Number(val) : null)}
                placeholder="All teams"
                className="w-full"
                disabled={isLocked('org_unit_id')}
              />
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-sm">Team</Label>
            <div className="text-[13px] text-muted-foreground h-10 flex items-center border rounded-md px-3 bg-muted/50">
              Filtered to your team automatically
            </div>
          </div>
        )}
        <div>
          <Label className="mb-1.5 block text-sm">Worklog type</Label>
          <MultiSelect
            options={WORKLOG_TYPE_OPTIONS}
            selected={filters.worklog_types}
            onChange={(vals) => onFilter('worklog_types', vals as ('JIRA' | 'MANUAL')[])}
            placeholder="All types"
            disabled={isLocked('worklog_types')}
          />
        </div>
      </div>

      {/* Col 4: Employees (manager only) */}
      <div className="space-y-3">
        {isManager ? (
          <div>
            <Label className="mb-1.5 block text-sm">Employees</Label>
            {loadingEmps ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <MultiSelect
                options={employeeOptions}
                selected={filters.user_ids.map(String)}
                onChange={(vals) => onFilter('user_ids', vals.map(Number))}
                placeholder="All employees"
                disabled={isLocked('user_ids')}
              />
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-sm">Employee</Label>
            <div className="text-[13px] font-medium h-10 flex items-center border rounded-md px-3 bg-muted/50">
              {user?.display_name || 'Loading...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
