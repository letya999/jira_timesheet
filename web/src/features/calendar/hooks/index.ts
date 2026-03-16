import { useQuery } from '@tanstack/react-query';
import {
  getAllCalendarEventsApiV1CalendarEventsGet,
  getHolidaysApiV1CalendarHolidaysGet,
} from '../../../api/generated/sdk.gen';

export const calendarKeys = {
  all: () => ['calendar'] as const,
  events: (params?: object) => ['calendar', 'events', params] as const,
  holidays: (params?: object) => ['calendar', 'holidays', params] as const,
};

export function useCalendar(params: {
  start_date: string;
  end_date: string;
  user_id?: number;
}) {
  return useQuery({
    queryKey: calendarKeys.events(params),
    queryFn: async () => {
      const res = await getAllCalendarEventsApiV1CalendarEventsGet({
        throwOnError: true,
        query: params,
      });
      return res.data;
    },
  });
}

export function useHolidays(params: { start_date: string; end_date: string }) {
  return useQuery({
    queryKey: calendarKeys.holidays(params),
    queryFn: async () => {
      const res = await getHolidaysApiV1CalendarHolidaysGet({ throwOnError: true, query: params });
      return res.data;
    },
    // Holidays change infrequently — cache for 24h
    staleTime: 24 * 60 * 60 * 1_000,
    gcTime: 24 * 60 * 60 * 1_000,
  });
}
