import { useMutation, useQuery } from '@tanstack/react-query';
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
import type { ReportRequest } from '../schemas';

export * from './use-report-filters';

export const reportsKeys = {
  all: () => ['reports'] as const,
  dashboard: (params?: object) => ['reports', 'dashboard', params] as const,
  capex: (params?: object) => ['reports', 'capex', params] as const,
  opex: (params?: object) => ['reports', 'opex', params] as const,
  custom: (params?: object) => ['reports', 'custom', params] as const,
  categories: () => ['reports', 'categories'] as const,
  sprints: () => ['reports', 'sprints'] as const,
  orgUnits: () => ['reports', 'org-units'] as const,
  employees: () => ['reports', 'employees'] as const,
  projects: () => ['reports', 'projects'] as const,
  projectReleases: (projectId: number) => ['reports', 'releases', projectId] as const,
};

type DashboardParams = {
  start_date: string;
  end_date: string;
  org_unit_id?: number;
};

export function useCapexReport(params: DashboardParams) {
  return useQuery({
    queryKey: reportsKeys.capex(params),
    queryFn: async () => {
      const res = await getDashboardDataApiV1ReportsDashboardGet({
        throwOnError: true,
        query: params,
      });
      return res.data;
    },
    enabled: !!params.start_date && !!params.end_date,
  });
}

export function useOpexReport(params: DashboardParams) {
  return useQuery({
    queryKey: reportsKeys.opex(params),
    queryFn: async () => {
      const res = await getDashboardDataApiV1ReportsDashboardGet({
        throwOnError: true,
        query: params,
      });
      return res.data;
    },
    enabled: !!params.start_date && !!params.end_date,
  });
}

// Export is a mutation because it triggers a file download side-effect
export function useExportReport() {
  return useMutation({
    mutationFn: async (params: { start_date: string; end_date: string }) => {
      const res = await exportReportApiV1ReportsExportGet({
        throwOnError: true,
        query: params,
      });
      return res.data;
    },
  });
}

export function useCustomReport(body: ReportRequest | null) {
  return useQuery({
    queryKey: reportsKeys.custom(body ?? undefined),
    queryFn: async () => {
      const res = await getCustomReportApiV1ReportsCustomPost({
        throwOnError: true,
        body: body!,
      });
      return res.data;
    },
    enabled: !!body,
  });
}

export function useReportCategories() {
  return useQuery({
    queryKey: reportsKeys.categories(),
    queryFn: async () => {
      const res = await getReportCategoriesApiV1ReportsCategoriesGet({ throwOnError: true });
      return res.data as Array<{ id: number; name: string }>;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useReportSprints() {
  return useQuery({
    queryKey: reportsKeys.sprints(),
    queryFn: async () => {
      const res = await getReportSprintsApiV1ReportsSprintsGet({ throwOnError: true });
      return res.data as Array<{ id: number; name: string }>;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useReportOrgUnits(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportsKeys.orgUnits(),
    queryFn: async () => {
      const res = await getOrgUnitsApiV1OrgUnitsGet({ throwOnError: true });
      return res.data as Array<{ id: number; name: string }>;
    },
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useReportEmployees() {
  return useQuery({
    queryKey: reportsKeys.employees(),
    queryFn: async () => {
      const res = await getEmployeesApiV1OrgEmployeesGet({ throwOnError: true });
      const paginated = res.data as unknown as { items?: Array<{ id: number; display_name: string }> };
      return paginated.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useReportProjects() {
  return useQuery({
    queryKey: reportsKeys.projects(),
    queryFn: async () => {
      const res = await getProjectsApiV1ProjectsGet({
        throwOnError: true,
        query: { size: 200 },
      });
      const data = res.data as { items?: Array<{ id: number; key: string; name: string }> };
      return data.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjectReleases(projectId: number | null) {
  return useQuery({
    queryKey: reportsKeys.projectReleases(projectId ?? 0),
    queryFn: async () => {
      const res = await getProjectReleasesApiV1ProjectsProjectIdReleasesGet({
        throwOnError: true,
        path: { project_id: projectId! },
      });
      return res.data as Array<{ id: number; name: string }>;
    },
    enabled: projectId !== null,
    staleTime: 5 * 60 * 1000,
  });
}
