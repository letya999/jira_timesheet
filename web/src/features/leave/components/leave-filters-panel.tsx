import type { ReactNode } from 'react';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { LEAVE_TYPE_LABELS } from '@/components/leave/leave-absence-badge';
import type { LeaveType } from '@/api/generated/types.gen';
import type { LeaveFilters, LeaveTab } from '../types';
import { LEAVE_STATUS_OPTIONS } from '../types';
import { useTranslation } from 'react-i18next';

interface LeaveFiltersPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  filters: LeaveFilters;
  activeTab: LeaveTab;
  teamOptions: Array<{ label: string; value: string }>;
  employeeOptions: Array<{ label: string; value: string }>;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onTeamIdsChange: (teamIds: number[]) => void;
  onEmployeeIdsChange: (employeeIds: number[]) => void;
  onLeaveTypesChange: (types: LeaveType[]) => void;
  onStatusesChange: (statuses: Array<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'>) => void;
}

export function LeaveFiltersPanel({
  open,
  onOpenChange,
  trigger,
  filters,
  activeTab,
  teamOptions,
  employeeOptions,
  onDateRangeChange,
  onTeamIdsChange,
  onEmployeeIdsChange,
  onLeaveTypesChange,
  onStatusesChange,
}: LeaveFiltersPanelProps) {
  const { t } = useTranslation();
  const disableOrgFilters = activeTab === 'my';

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className="flex justify-end">
        {trigger}
      </div>
      <CollapsibleContent className="space-y-4 rounded-md border p-4 bg-muted/20">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <Label className="mb-1.5 block text-sm">{t('common.period')}</Label>
            <DateRangePicker
              date={filters.dateRange}
              setDate={onDateRangeChange}
              className="w-full"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">{t('common.team')}</Label>
            <MultiSelect
              options={teamOptions}
              selected={filters.teamIds.map(String)}
              onChange={(vals) => onTeamIdsChange(vals.map(Number))}
              placeholder={t('journal.all_teams')}
              disabled={disableOrgFilters}
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">{t('common.employees')}</Label>
            <MultiSelect
              options={employeeOptions}
              selected={filters.employeeIds.map(String)}
              onChange={(vals) => onEmployeeIdsChange(vals.map(Number))}
              placeholder={t('web.reports.all_employees')}
              disabled={disableOrgFilters}
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">{t('leaves.type')}</Label>
            <MultiSelect
              options={Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              selected={filters.leaveTypes}
              onChange={(vals) => onLeaveTypesChange(vals as LeaveType[])}
              placeholder={t('web.employees.all_types', 'All Types')}
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">{t('common.status')}</Label>
            <MultiSelect
              options={LEAVE_STATUS_OPTIONS}
              selected={filters.statuses}
              onChange={(vals) => onStatusesChange(vals as Array<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'>)}
              placeholder={t('web.leave.all_statuses')}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
