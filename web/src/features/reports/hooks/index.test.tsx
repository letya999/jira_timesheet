import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithQuery } from '../../../test/render-with-providers';
import {
  getDashboardDataApiV1ReportsDashboardGet,
  getCustomReportApiV1ReportsCustomPost,
  exportReportApiV1ReportsExportGet,
  getReportCategoriesApiV1ReportsCategoriesGet,
  getReportSprintsApiV1ReportsSprintsGet,
  getOrgUnitsApiV1OrgUnitsGet,
  getEmployeesApiV1OrgEmployeesGet,
  getProjectsApiV1ProjectsGet,
  getProjectReleasesApiV1ProjectsProjectIdReleasesGet,
} from '../../../api/generated/sdk.gen';
import {
  useCapexReport,
  useOpexReport,
  useCustomReport,
  useReportCategories,
  useReportSprints,
  useReportOrgUnits,
  useReportEmployees,
  useReportProjects,
  useProjectReleases,
  useExportReport,
} from './index';

vi.mock('../../../api/generated/sdk.gen', () => ({
  getDashboardDataApiV1ReportsDashboardGet: vi.fn(),
  getCustomReportApiV1ReportsCustomPost: vi.fn(),
  exportReportApiV1ReportsExportGet: vi.fn(),
  getReportCategoriesApiV1ReportsCategoriesGet: vi.fn(),
  getReportSprintsApiV1ReportsSprintsGet: vi.fn(),
  getOrgUnitsApiV1OrgUnitsGet: vi.fn(),
  getEmployeesApiV1OrgEmployeesGet: vi.fn(),
  getProjectsApiV1ProjectsGet: vi.fn(),
  getProjectReleasesApiV1ProjectsProjectIdReleasesGet: vi.fn(),
}));

describe('Reports Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCapexReport', () => {
    it('does not fetch when start_date is empty', () => {
      const { result } = renderHookWithQuery(() =>
        useCapexReport({ start_date: '', end_date: '2026-03-15' })
      );
      expect(getDashboardDataApiV1ReportsDashboardGet).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('fetches and returns data when params are valid', async () => {
      const mockData = { data: [{ Hours: 8 }] };
      vi.mocked(getDashboardDataApiV1ReportsDashboardGet).mockResolvedValue({ data: mockData } as any);

      const { result } = renderHookWithQuery(() =>
        useCapexReport({ start_date: '2026-03-01', end_date: '2026-03-15' })
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
      expect(getDashboardDataApiV1ReportsDashboardGet).toHaveBeenCalledWith({
        throwOnError: true,
        query: { start_date: '2026-03-01', end_date: '2026-03-15' },
      });
    });
  });

  describe('useOpexReport', () => {
    it('fetches and returns data when params are valid', async () => {
      const mockData = { data: [{ Hours: 10 }] };
      vi.mocked(getDashboardDataApiV1ReportsDashboardGet).mockResolvedValue({ data: mockData } as any);

      const { result } = renderHookWithQuery(() =>
        useOpexReport({ start_date: '2026-03-01', end_date: '2026-03-15' })
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useCustomReport', () => {
    it('does not fetch when body is null', () => {
      const { result } = renderHookWithQuery(() => useCustomReport(null));
      expect(getCustomReportApiV1ReportsCustomPost).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('fetches when body is provided', async () => {
      const mockBody = { start_date: '2026-03-01', end_date: '2026-03-15', group_by_rows: ['user'] };
      const mockData = { data: [], columns: [] };
      vi.mocked(getCustomReportApiV1ReportsCustomPost).mockResolvedValue({ data: mockData } as any);

      const { result } = renderHookWithQuery(() => useCustomReport(mockBody as any));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
      expect(getCustomReportApiV1ReportsCustomPost).toHaveBeenCalledWith({
        throwOnError: true,
        body: mockBody,
      });
    });
  });

  describe('useReportCategories', () => {
    it('fetches categories from SDK and returns mapped array', async () => {
      const mockCategories = [{ id: 1, name: 'Dev' }, { id: 2, name: 'QA' }];
      vi.mocked(getReportCategoriesApiV1ReportsCategoriesGet).mockResolvedValue({ data: mockCategories } as any);

      const { result } = renderHookWithQuery(() => useReportCategories());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockCategories);
    });
  });

  describe('useReportSprints', () => {
    it('fetches sprints, returns array', async () => {
      const mockSprints = [{ id: 1, name: 'Sprint 1' }, { id: 2, name: 'Sprint 2' }];
      vi.mocked(getReportSprintsApiV1ReportsSprintsGet).mockResolvedValue({ data: mockSprints } as any);

      const { result } = renderHookWithQuery(() => useReportSprints());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSprints);
    });
  });

  describe('useReportOrgUnits', () => {
    it('fetches org units, returns array', async () => {
      const mockOrgUnits = [{ id: 1, name: 'Engineering' }];
      vi.mocked(getOrgUnitsApiV1OrgUnitsGet).mockResolvedValue({ data: mockOrgUnits } as any);

      const { result } = renderHookWithQuery(() => useReportOrgUnits());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockOrgUnits);
    });
  });

  describe('useReportEmployees', () => {
    it('handles paginated response and extracts items array', async () => {
      const mockEmployeesPaginated = { items: [{ id: 1, display_name: 'Alice' }] };
      vi.mocked(getEmployeesApiV1OrgEmployeesGet).mockResolvedValue({ data: mockEmployeesPaginated } as any);

      const { result } = renderHookWithQuery(() => useReportEmployees());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockEmployeesPaginated.items);
    });

    it('returns empty array when items is undefined', async () => {
      vi.mocked(getEmployeesApiV1OrgEmployeesGet).mockResolvedValue({ data: {} } as any);

      const { result } = renderHookWithQuery(() => useReportEmployees());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });
  });

  describe('useReportProjects', () => {
    it('extracts items from paginated response and passes size: 200', async () => {
      const mockProjectsPaginated = { items: [{ id: 1, key: 'BE', name: 'Backend' }] };
      vi.mocked(getProjectsApiV1ProjectsGet).mockResolvedValue({ data: mockProjectsPaginated } as any);

      const { result } = renderHookWithQuery(() => useReportProjects());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockProjectsPaginated.items);
      expect(getProjectsApiV1ProjectsGet).toHaveBeenCalledWith({
        throwOnError: true,
        query: { size: 200 },
      });
    });
  });

  describe('useProjectReleases', () => {
    it('disabled when projectId is null', () => {
      const { result } = renderHookWithQuery(() => useProjectReleases(null));
      expect(getProjectReleasesApiV1ProjectsProjectIdReleasesGet).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('fetches when projectId is provided', async () => {
      const mockReleases = [{ id: 1, name: 'v1.0' }];
      vi.mocked(getProjectReleasesApiV1ProjectsProjectIdReleasesGet).mockResolvedValue({ data: mockReleases } as any);

      const { result } = renderHookWithQuery(() => useProjectReleases(123));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockReleases);
      expect(getProjectReleasesApiV1ProjectsProjectIdReleasesGet).toHaveBeenCalledWith({
        throwOnError: true,
        path: { project_id: 123 },
      });
    });
  });

  describe('useExportReport', () => {
    it('calls SDK with start_date and end_date and returns blob data', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/vnd.ms-excel' });
      vi.mocked(exportReportApiV1ReportsExportGet).mockResolvedValue({ data: mockBlob } as any);

      const { result } = renderHookWithQuery(() => useExportReport());

      await result.current.mutateAsync({ start_date: '2026-03-01', end_date: '2026-03-15' });

      expect(exportReportApiV1ReportsExportGet).toHaveBeenCalledWith({
        throwOnError: true,
        query: { start_date: '2026-03-01', end_date: '2026-03-15' },
      });
    });
  });
});
