import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllWorklogsApiV1TimesheetGet,
  getMyWorklogsApiV1TimesheetWorklogsGet,
  createManualLogApiV1TimesheetManualPost,
} from '../../../api/generated/sdk.gen';
import { toast } from '../../../lib/toast';
import type { ManualLogCreate } from '../schemas';

export const timesheetKeys = {
  all: () => ['timesheet'] as const,
  entries: (params?: object) => ['timesheet', 'entries', params] as const,
  myEntries: (params?: object) => ['timesheet', 'my-entries', params] as const,
};

type WorklogEntry = {
  id: number;
  date: string;
  hours: number;
  type: string;
  status: string;
  description: string | null;
  [key: string]: unknown;
};

export function useTimesheetEntries(params?: {
  start_date?: string;
  end_date?: string;
  user_id?: number;
  skip?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: timesheetKeys.entries(params),
    queryFn: async () => {
      const res = await getAllWorklogsApiV1TimesheetGet({ throwOnError: true, query: params });
      return res.data;
    },
  });
}

export function useMyTimesheetEntries(params?: {
  start_date: string;
  end_date: string;
}) {
  return useQuery({
    queryKey: timesheetKeys.myEntries(params),
    queryFn: async () => {
      const res = await getMyWorklogsApiV1TimesheetWorklogsGet({
        throwOnError: true,
        query: params!,
      });
      return res.data;
    },
    enabled: !!params?.start_date && !!params?.end_date,
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ManualLogCreate) => {
      const res = await createManualLogApiV1TimesheetManualPost({
        throwOnError: true,
        body,
      });
      return res.data;
    },
    onMutate: async (newEntry) => {
      // Cancel any in-flight queries to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: timesheetKeys.all() });

      const previousEntries = queryClient.getQueriesData<WorklogEntry[]>({
        queryKey: timesheetKeys.all(),
      });

      // Optimistically add a temporary entry
      queryClient.setQueriesData<WorklogEntry[]>(
        { queryKey: timesheetKeys.all() },
        (old) => {
          if (!Array.isArray(old)) return old;
          const optimistic: WorklogEntry = {
            id: -Date.now(), // temporary negative ID
            date: newEntry.date,
            hours: newEntry.hours,
            type: 'MANUAL',
            status: 'DRAFT',
            description: newEntry.description ?? null,
            category: newEntry.category,
            _optimistic: true,
          };
          return [optimistic, ...old];
        },
      );

      return { previousEntries };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousEntries) {
        for (const [key, data] of ctx.previousEntries) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to create entry. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all() });
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_input: { id: number; data: Partial<ManualLogCreate> }) => {
      // No dedicated update endpoint in the generated SDK — submit/approve actions cover status
      // This will be wired when a PATCH /timesheet/{id} endpoint is added to the backend
      throw new Error('Update entry endpoint not yet available');
    },
    onMutate: async ({ id, data: entryData }) => {
      await queryClient.cancelQueries({ queryKey: timesheetKeys.all() });

      const previousEntries = queryClient.getQueriesData<WorklogEntry[]>({
        queryKey: timesheetKeys.all(),
      });

      queryClient.setQueriesData<WorklogEntry[]>(
        { queryKey: timesheetKeys.all() },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((e) => (e.id === id ? { ...e, ...entryData } : e));
        },
      );

      return { previousEntries };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousEntries) {
        for (const [key, d] of ctx.previousEntries) {
          queryClient.setQueryData(key, d);
        }
      }
      toast.error('Failed to update entry. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all() });
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_entryId: number) => {
      // No dedicated delete endpoint in the generated SDK
      // Will be wired when DELETE /timesheet/{id} is added to the backend
      throw new Error('Delete entry endpoint not yet available');
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: timesheetKeys.all() });

      const previousEntries = queryClient.getQueriesData<WorklogEntry[]>({
        queryKey: timesheetKeys.all(),
      });

      queryClient.setQueriesData<WorklogEntry[]>(
        { queryKey: timesheetKeys.all() },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.filter((e) => e.id !== id);
        },
      );

      return { previousEntries };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousEntries) {
        for (const [key, d] of ctx.previousEntries) {
          queryClient.setQueryData(key, d);
        }
      }
      toast.error('Failed to delete entry. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all() });
    },
  });
}
