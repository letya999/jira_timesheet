import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReportFilters } from './use-report-filters';
import { format, subDays } from 'date-fns';

describe('useReportFilters', () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  describe('initial state', () => {
    it('has correct default values', () => {
      const { result } = renderHook(() => useReportFilters());
      expect(result.current.filters.start_date).toBe(thirtyDaysAgo);
      expect(result.current.filters.end_date).toBe(today);
      expect(result.current.filters.group_by_rows).toEqual(['user', 'project']);
      expect(result.current.filters.group_by_cols).toEqual(['date']);
      expect(result.current.filters.date_granularity).toBe('week');
      expect(result.current.filters.format).toBe('hours');
    });

    it('respects initialOverrides', () => {
      const { result } = renderHook(() => useReportFilters({ format: 'days', hours_per_day: 7 }));
      expect(result.current.filters.format).toBe('days');
      expect(result.current.filters.hours_per_day).toBe(7);
      expect(result.current.filters.group_by_rows).toEqual(['user', 'project']);
    });
  });

  describe('setFilter', () => {
    it('updates project_id and leaves other fields unchanged', () => {
      const { result } = renderHook(() => useReportFilters());
      act(() => {
        result.current.setFilter('project_id', 123);
      });
      expect(result.current.filters.project_id).toBe(123);
      expect(result.current.filters.format).toBe('hours');
    });

    it('updates worklog_types array', () => {
      const { result } = renderHook(() => useReportFilters());
      act(() => {
        result.current.setFilter('worklog_types', ['JIRA']);
      });
      expect(result.current.filters.worklog_types).toEqual(['JIRA']);
    });
  });

  describe('clearAll', () => {
    it('resets all filters to defaults', () => {
      const { result } = renderHook(() => useReportFilters());
      act(() => {
        result.current.setFilter('project_id', 123);
        result.current.setFilter('format', 'days');
        result.current.clearAll();
      });
      expect(result.current.filters.project_id).toBe(null);
      expect(result.current.filters.format).toBe('hours');
    });

    it('respects initialOverrides when clearing', () => {
      const { result } = renderHook(() => useReportFilters({ format: 'days' }));
      act(() => {
        result.current.setFilter('format', 'hours');
        result.current.clearAll();
      });
      expect(result.current.filters.format).toBe('days');
    });
  });

  describe('toReportRequest', () => {
    it('omits null values and empty arrays', () => {
      const { result } = renderHook(() => useReportFilters());
      const request = result.current.toReportRequest();
      expect(request.project_id).toBeUndefined();
      expect(request.user_ids).toBeUndefined();
      expect(request.start_date).toBe(thirtyDaysAgo);
    });

    it('includes non-empty values', () => {
      const { result } = renderHook(() => useReportFilters());
      act(() => {
        result.current.setFilter('project_id', 123);
        result.current.setFilter('sprint_ids', [1, 2]);
      });
      const request = result.current.toReportRequest();
      expect(request.project_id).toBe(123);
      expect(request.sprint_ids).toEqual([1, 2]);
    });
  });

  describe('toFilterChips', () => {
    const mockLabels = {
      projects: { 123: 'Project A' },
      sprints: { 1: 'Sprint 1', 2: 'Sprint 2' }
    };

    it('always includes a date chip', () => {
      const { result } = renderHook(() => useReportFilters());
      const chips = result.current.toFilterChips({});
      expect(chips).toContainEqual(expect.objectContaining({ id: 'date' }));
    });

    it('includes project chip when project_id is set and label provided', () => {
      const { result } = renderHook(() => useReportFilters());
      act(() => { result.current.setFilter('project_id', 123); });
      const chips = result.current.toFilterChips(mockLabels);
      expect(chips).toContainEqual(expect.objectContaining({ id: 'project', value: 'Project A' }));
    });

    it('does NOT include project chip when project_id is null', () => {
      const { result } = renderHook(() => useReportFilters());
      const chips = result.current.toFilterChips(mockLabels);
      expect(chips.find(c => c.id === 'project')).toBeUndefined();
    });

    it('includes sprints chip with mapped names', () => {
      const { result } = renderHook(() => useReportFilters());
      act(() => { result.current.setFilter('sprint_ids', [1, 2]); });
      const chips = result.current.toFilterChips(mockLabels);
      expect(chips).toContainEqual(expect.objectContaining({ id: 'sprints', value: 'Sprint 1, Sprint 2' }));
    });

    it('includes types chip when worklog_types is non-empty', () => {
      const { result } = renderHook(() => useReportFilters());
      act(() => { result.current.setFilter('worklog_types', ['JIRA', 'MANUAL']); });
      const chips = result.current.toFilterChips({});
      expect(chips).toContainEqual(expect.objectContaining({ id: 'types', value: 'JIRA, MANUAL' }));
    });
  });
});
