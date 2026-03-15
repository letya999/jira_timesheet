import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getDashboardDataApiV1ReportsDashboardGet,
  getCustomReportApiV1ReportsCustomPost,
  exportReportApiV1ReportsExportGet,
} from '../../../api/generated/sdk.gen';

export const reportsKeys = {
  all: () => ['reports'] as const,
  dashboard: (params?: object) => ['reports', 'dashboard', params] as const,
  capex: (params?: object) => ['reports', 'capex', params] as const,
  opex: (params?: object) => ['reports', 'opex', params] as const,
  custom: (params?: object) => ['reports', 'custom', params] as const,
};

type DashboardParams = {
  start_date: string;
  end_date: string;
  team_id?: number;
  view?: string;
};

type ReportBody = {
  start_date: string;
  end_date: string;
  category?: string;
  project_keys?: string[];
  user_ids?: number[];
  team_ids?: number[];
  sprint?: string;
};

export function useCapexReport(params: DashboardParams) {
  return useQuery({
    queryKey: reportsKeys.capex(params),
    queryFn: async () => {
      const res = await getDashboardDataApiV1ReportsDashboardGet({
        throwOnError: true,
        query: { ...params, view: 'capex' },
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
        query: { ...params, view: 'opex' },
      });
      return res.data;
    },
    enabled: !!params.start_date && !!params.end_date,
  });
}

// Export is a mutation because it triggers a file download side-effect
export function useExportReport() {
  return useMutation({
    mutationFn: async (params: { start_date: string; end_date: string; format?: string }) => {
      const res = await exportReportApiV1ReportsExportGet({
        throwOnError: true,
        query: params,
      });
      return res.data;
    },
  });
}

export function useCustomReport(body: ReportBody | null) {
  return useQuery({
    queryKey: reportsKeys.custom(body ?? {}),
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
