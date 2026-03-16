import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orgUnitCreateSchema, OrgUnitCreate, OrgUnitResponse } from '@/features/org/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

interface UnitFormProps {
  initialData?: OrgUnitResponse;
  units: OrgUnitResponse[];
  onSubmit: (data: OrgUnitCreate | Partial<OrgUnitCreate>) => void;
  isPending: boolean;
  onCancel?: () => void;
}

export function UnitForm({ initialData, units, onSubmit, isPending, onCancel }: UnitFormProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<OrgUnitCreate>({
    resolver: zodResolver(orgUnitCreateSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          parent_id: initialData.parent_id,
          reporting_period: initialData.reporting_period as 'weekly' | 'monthly' | 'biweekly',
        }
      : {
          name: '',
          parent_id: null,
          reporting_period: 'weekly' as const,
        },
  });

  const parentId = watch('parent_id');
  const reportingPeriod = watch('reporting_period');

  // Helper to get full path of a unit
  const getUnitPath = (unit: OrgUnitResponse): string => {
    const path = [unit.name];
    let current = unit;
    while (current.parent_id) {
      const parent = units.find((u) => u.id === current.parent_id);
      if (parent) {
        path.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
    }
    return path.join(' > ');
  };

  // Filter out the unit itself and its descendants from parent options to avoid cycles
  const getDescendantIds = (unitId: number): number[] => {
    const children = units.filter((u) => u.parent_id === unitId);
    return [...children.map((c) => c.id), ...children.flatMap((c) => getDescendantIds(c.id))];
  };

  const forbiddenIds = initialData ? [initialData.id, ...getDescendantIds(initialData.id)] : [];
  const parentOptions = units
    .filter((u) => !forbiddenIds.includes(u.id))
    .map((u) => ({ id: u.id, path: getUnitPath(u) }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const handleFormSubmit = (data: OrgUnitCreate) => {
    onSubmit(data);
    if (!initialData) reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 border p-4 rounded-md">
      <h3 className="text-lg font-medium">{initialData ? t('org.edit_delete_unit') : t('org.add_unit')}</h3>
      
      <div className="space-y-2">
        <Label htmlFor="unit-name">{t('org.unit_name')}</Label>
        <Input id="unit-name" {...register('name')} placeholder={t('web.org.unit_name_placeholder')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="parent-unit">{t('org.parent_unit')}</Label>
        <Select
          value={parentId?.toString() || 'none'}
          onValueChange={(val) => setValue('parent_id', val === 'none' ? null : Number(val))}
        >
          <SelectTrigger id="parent-unit">
            <SelectValue placeholder={t('org.none_root')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('org.none_root')}</SelectItem>
            {parentOptions.map((u) => (
              <SelectItem key={u.id} value={u.id.toString()}>
                {u.path}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reporting-period">{t('org.reporting_period')}</Label>
        <Select
          value={reportingPeriod}
          onValueChange={(val: OrgUnitCreate['reporting_period']) => setValue('reporting_period', val)}
        >
          <SelectTrigger id="reporting-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">{t('org.period_weekly')}</SelectItem>
            <SelectItem value="biweekly">{t('org.period_biweekly')}</SelectItem>
            <SelectItem value="monthly">{t('org.period_monthly')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? t('web.org.saving') : initialData ? t('org.update_unit') : t('org.create_unit')}
        </Button>
      </div>
    </form>
  );
}
