import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { FilterToggleButton } from '@/components/shared/filter-toggle-button';
import type { OrgUnitResponse, UserType } from '@/api/generated/types.gen';

interface EmployeeFilterPanelProps {
  orgUnits: OrgUnitResponse[];
  onFilterChange: (filters: {
    search?: string;
    type?: UserType;
    org_unit_id?: number;
  }) => void;
}

export function EmployeeFilterPanel({
  orgUnits,
  onFilterChange,
}: EmployeeFilterPanelProps) {
  const { t } = useTranslation('employees');
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [type, setType] = React.useState<UserType | 'all'>('all');
  const [orgUnitId, setOrgUnitId] = React.useState<string>('all');

  const handleApply = React.useCallback(() => {
    onFilterChange({
      search: search || undefined,
      type: type === 'all' ? undefined : (type as UserType),
      org_unit_id: orgUnitId === 'all' ? undefined : Number(orgUnitId),
    });
  }, [search, type, orgUnitId, onFilterChange]);

  const handleReset = () => {
    setSearch('');
    setType('all');
    setOrgUnitId('all');
    onFilterChange({});
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search_placeholder', 'Search employees...')}
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={handleApply}>
            {t('apply', 'Apply')}
          </Button>
        </div>
        <CollapsibleTrigger asChild>
          <FilterToggleButton
            isOpen={isOpen}
            showLabel={t('show_filters', 'Show Filters')}
            hideLabel={t('hide_filters', 'Hide Filters')}
          />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-4 rounded-md border p-4 bg-muted/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('user_type', 'User Type')}</label>
            <Select value={type} onValueChange={(val: string) => setType(val as UserType | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder={t('all_types', 'All Types')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_types', 'All Types')}</SelectItem>
                <SelectItem value="system">{t('system', 'System')}</SelectItem>
                <SelectItem value="import">{t('import', 'Import')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('org_unit', 'Org Unit')}</label>
            <Select value={orgUnitId} onValueChange={setOrgUnitId}>
              <SelectTrigger>
                <SelectValue placeholder={t('all_units', 'All Units')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_units', 'All Units')}</SelectItem>
                {orgUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id.toString()}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button className="flex-1" onClick={handleApply}>
              {t('apply_filters', 'Apply Filters')}
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset} title={t('reset_filters', 'Reset Filters')}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
