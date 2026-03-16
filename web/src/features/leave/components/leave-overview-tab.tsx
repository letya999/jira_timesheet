import { useMemo, useState } from 'react';
import { addDays, addMonths, addQuarters, addWeeks, addYears, endOfMonth, endOfQuarter, endOfYear, format, startOfMonth, startOfQuarter, startOfWeek, startOfYear } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, List } from 'lucide-react';
import type { LeaveResponse } from '@/api/generated/types.gen';
import { LeaveTimeline, type TimelineView } from '@/components/leave/leave-timeline';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mapRequestsToTimelineData } from '../utils';
import { LeaveAbsenceList } from './leave-absence-list';
import { useHolidays } from '@/features/calendar/hooks';

interface LeaveOverviewTabProps {
  requests: LeaveResponse[];
  startDate: Date;
}

const TIMELINE_VIEWS: Array<{ value: TimelineView; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

export function LeaveOverviewTab({ requests, startDate }: LeaveOverviewTabProps) {
  const [displayMode, setDisplayMode] = useState<'calendar' | 'list'>('calendar');
  const [timelineView, setTimelineView] = useState<TimelineView>('month');
  const [cursorDate, setCursorDate] = useState(startDate);

  const alignToView = (date: Date, view: TimelineView) => {
    switch (view) {
      case 'day':
        return date;
      case 'week':
        return startOfWeek(date, { weekStartsOn: 1 });
      case 'month':
        return startOfMonth(date);
      case 'quarter':
        return startOfQuarter(date);
      case 'year':
        return startOfYear(date);
    }
  };

  const shift = (dir: 'prev' | 'next') => {
    const step = dir === 'next' ? 1 : -1;
    setCursorDate((prev) => {
      switch (timelineView) {
        case 'day':
          return addDays(prev, step);
        case 'week':
          return addWeeks(prev, step * 2);
        case 'month':
          return addMonths(prev, step);
        case 'quarter':
          return addQuarters(prev, step);
        case 'year':
          return addYears(prev, step);
      }
    });
  };

  const periodLabel = useMemo(() => {
    switch (timelineView) {
      case 'day':
        return format(cursorDate, 'MMMM d, yyyy');
      case 'week':
        return `${format(cursorDate, 'MMM d')} - ${format(addDays(cursorDate, 13), 'MMM d, yyyy')}`;
      case 'month':
        return format(cursorDate, 'MMMM yyyy');
      case 'quarter':
        return `Q${Math.ceil((cursorDate.getMonth() + 1) / 3)} ${format(cursorDate, 'yyyy')}`;
      case 'year':
        return format(cursorDate, 'yyyy');
    }
  }, [timelineView, cursorDate]);

  const visibleRange = useMemo(() => {
    switch (timelineView) {
      case 'day':
        return { start: alignToView(cursorDate, timelineView), end: alignToView(cursorDate, timelineView) };
      case 'week': {
        const start = alignToView(cursorDate, timelineView);
        return { start, end: addDays(start, 13) };
      }
      case 'month': {
        const start = alignToView(cursorDate, timelineView);
        return { start, end: endOfMonth(start) };
      }
      case 'quarter': {
        const start = alignToView(cursorDate, timelineView);
        return { start, end: endOfQuarter(start) };
      }
      case 'year': {
        const start = alignToView(cursorDate, timelineView);
        return { start, end: endOfYear(start) };
      }
    }
  }, [cursorDate, timelineView]);

  const holidaysQuery = useHolidays({
    start_date: format(visibleRange.start, 'yyyy-MM-dd'),
    end_date: format(visibleRange.end, 'yyyy-MM-dd'),
  });

  const holidayDates = useMemo(() => {
    const list = holidaysQuery.data ?? [];
    return new Set(list.filter((holiday) => holiday.is_holiday).map((holiday) => holiday.date));
  }, [holidaysQuery.data]);

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 p-10 text-center text-muted-foreground">
        Нет отсутствий по выбранным фильтрам.
      </div>
    );
  }

  const { users, entries } = mapRequestsToTimelineData(requests);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="inline-flex rounded-md border bg-muted/30 p-1">
          <Button
            variant={displayMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setDisplayMode('calendar')}
          >
            <CalendarDays className="size-4" />
            Календарь
          </Button>
          <Button
            variant={displayMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setDisplayMode('list')}
          >
            <List className="size-4" />
            Список
          </Button>
        </div>

        {displayMode === 'calendar' && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shift('prev')}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[180px] text-center text-sm font-medium">{periodLabel}</div>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shift('next')}>
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursorDate(alignToView(new Date(), timelineView))}
            >
              Today
            </Button>
            <Select
              value={timelineView}
              onValueChange={(v) => {
                const next = v as TimelineView;
                setTimelineView(next);
                setCursorDate((prev) => alignToView(prev, next));
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Timeline view" />
              </SelectTrigger>
              <SelectContent>
                {TIMELINE_VIEWS.map((view) => (
                  <SelectItem key={view.value} value={view.value}>
                    {view.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {displayMode === 'calendar' ? (
        <LeaveTimeline
          view={timelineView}
          startDate={alignToView(cursorDate, timelineView)}
          users={users}
          entries={entries}
          holidayDates={holidayDates}
          className="min-h-[560px]"
        />
      ) : (
        <LeaveAbsenceList
          requests={requests}
          isLoading={false}
          emptyTitle="Нет отсутствий"
          emptySubtitle="По текущим фильтрам отсутствий нет"
        />
      )}
    </div>
  );
}
