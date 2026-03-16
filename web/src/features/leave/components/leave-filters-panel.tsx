import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import { CollapsibleFilterBlock } from '@/components/shared/collapsible-filter-block';
import { LEAVE_TYPE_LABELS } from '@/components/leave/leave-absence-badge';
import type { LeaveType } from '@/api/generated/types.gen';
import type { LeaveFilters, LeaveTab } from '../types';
import { LEAVE_STATUS_OPTIONS } from '../types';

interface LeaveFiltersPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const disableOrgFilters = activeTab === 'my';

  return (
    <CollapsibleFilterBlock
      title="Фильтры и поиск"
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div>
          <Label className="mb-1.5 block text-sm">Период</Label>
          <DateRangePicker
            date={filters.dateRange}
            setDate={onDateRangeChange}
            className="w-full"
          />
        </div>

        <div>
          <Label className="mb-1.5 block text-sm">Команда</Label>
          <MultiSelect
            options={teamOptions}
            selected={filters.teamIds.map(String)}
            onChange={(vals) => onTeamIdsChange(vals.map(Number))}
            placeholder="Все команды"
            disabled={disableOrgFilters}
          />
        </div>

        <div>
          <Label className="mb-1.5 block text-sm">Сотрудники</Label>
          <MultiSelect
            options={employeeOptions}
            selected={filters.employeeIds.map(String)}
            onChange={(vals) => onEmployeeIdsChange(vals.map(Number))}
            placeholder="Все сотрудники"
            disabled={disableOrgFilters}
          />
        </div>

        <div>
          <Label className="mb-1.5 block text-sm">Тип отсутствия</Label>
          <MultiSelect
            options={Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            selected={filters.leaveTypes}
            onChange={(vals) => onLeaveTypesChange(vals as LeaveType[])}
            placeholder="Все типы"
          />
        </div>

        <div>
          <Label className="mb-1.5 block text-sm">Статус</Label>
          <MultiSelect
            options={LEAVE_STATUS_OPTIONS}
            selected={filters.statuses}
            onChange={(vals) => onStatusesChange(vals as Array<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'>)}
            placeholder="Все статусы"
          />
        </div>
      </div>
    </CollapsibleFilterBlock>
  );
}
