import { useState, useCallback } from 'react';
import { subDays } from 'date-fns';
import type { FilterChip } from '@/components/shared/filter-bar';
import type { ReportRequest } from '../schemas';
import { dateUtils } from '@/lib/date-utils';

export type DateGranularity = 'day' | 'week' | '2weeks' | 'month' | 'quarter';
export type ValueFormat = 'hours' | 'days';

export type ReportFilters = {
  start_date: string;
  end_date: string;
  project_id: number | null;
  release_id: number | null;
  org_unit_id: number | null;
  user_ids: number[];
  sprint_ids: number[];
  worklog_types: ('JIRA' | 'MANUAL')[];
  category_ids: number[];
  group_by_rows: string[];
  group_by_cols: string[];
  date_granularity: DateGranularity;
  format: ValueFormat;
  hours_per_day: number;
};

const getInitialDates = () => {
  const now = dateUtils.now();
  return {
    today: dateUtils.formatPlain(now, 'yyyy-MM-dd'),
    thirtyDaysAgo: dateUtils.formatPlain(subDays(now, 30), 'yyyy-MM-dd'),
  };
};

const { today, thirtyDaysAgo } = getInitialDates();

export const DEFAULT_FILTERS: ReportFilters = {
  start_date: thirtyDaysAgo,
  end_date: today,
  project_id: null,
  release_id: null,
  org_unit_id: null,
  user_ids: [],
  sprint_ids: [],
  worklog_types: [],
  category_ids: [],
  group_by_rows: ['user', 'project'],
  group_by_cols: ['date'],
  date_granularity: 'week',
  format: 'hours',
  hours_per_day: 8,
};

export function useReportFilters(initialOverrides?: Partial<ReportFilters>) {
  const [filters, setFilters] = useState<ReportFilters>({
    ...DEFAULT_FILTERS,
    ...initialOverrides,
  });

  const setFilter = useCallback(<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, ...initialOverrides });
  }, [initialOverrides]);

  const toReportRequest = useCallback((): ReportRequest => ({
    start_date: filters.start_date,
    end_date: filters.end_date,
    project_id: filters.project_id ?? undefined,
    release_id: filters.release_id ?? undefined,
    org_unit_id: filters.org_unit_id ?? undefined,
    user_ids: filters.user_ids.length > 0 ? filters.user_ids : undefined,
    sprint_ids: filters.sprint_ids.length > 0 ? filters.sprint_ids : undefined,
    worklog_types: filters.worklog_types.length > 0 ? filters.worklog_types : undefined,
    category_ids: filters.category_ids.length > 0 ? filters.category_ids : undefined,
    group_by_rows: filters.group_by_rows,
    group_by_cols: filters.group_by_cols,
    date_granularity: filters.date_granularity,
    format: filters.format,
    hours_per_day: filters.hours_per_day,
  }), [filters]);

  const toFilterChips = useCallback((labels: {
    projects?: Record<number, string>;
    orgUnits?: Record<number, string>;
    employees?: Record<number, string>;
    sprints?: Record<number, string>;
    categories?: Record<number, string>;
  }): FilterChip[] => {
    const chips: FilterChip[] = [];

    chips.push({ id: 'date', label: 'Period', value: `${filters.start_date} — ${filters.end_date}` });

    const projectLabel = filters.project_id !== null ? labels.projects?.[filters.project_id] : undefined;
    if (projectLabel) {
      chips.push({ id: 'project', label: 'Project', value: projectLabel });
    }
    const orgUnitLabel = filters.org_unit_id !== null ? labels.orgUnits?.[filters.org_unit_id] : undefined;
    if (orgUnitLabel) {
      chips.push({ id: 'org_unit', label: 'Team', value: orgUnitLabel });
    }
    if (filters.worklog_types.length > 0) {
      chips.push({ id: 'types', label: 'Type', value: filters.worklog_types.join(', ') });
    }
    if (filters.sprint_ids.length > 0 && labels.sprints) {
      const names = filters.sprint_ids.map((id) => labels.sprints?.[id] ?? String(id)).join(', ');
      chips.push({ id: 'sprints', label: 'Sprints', value: names });
    }
    if (filters.category_ids.length > 0 && labels.categories) {
      const names = filters.category_ids.map((id) => labels.categories?.[id] ?? String(id)).join(', ');
      chips.push({ id: 'categories', label: 'Categories', value: names });
    }
    if (filters.user_ids.length > 0 && labels.employees) {
      chips.push({ id: 'users', label: 'Employees', value: `${filters.user_ids.length} selected` });
    }

    return chips;
  }, [filters]);

  return { filters, setFilter, clearAll, toReportRequest, toFilterChips };
}
