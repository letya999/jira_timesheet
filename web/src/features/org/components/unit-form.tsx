import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orgUnitCreateSchema, OrgUnitResponse } from '@/features/org/schemas';
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

interface UnitFormProps {
  initialData?: OrgUnitResponse;
  units: OrgUnitResponse[];
  onSubmit: (data: any) => void;
  isPending: boolean;
  onCancel?: () => void;
}

export function UnitForm({ initialData, units, onSubmit, isPending, onCancel }: UnitFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
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

  // Filter out the unit itself from parent options to avoid cycles
  const parentOptions = units.filter((u) => !initialData || u.id !== initialData.id);

  const handleFormSubmit = (data: any) => {
    onSubmit(data);
    if (!initialData) reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 border p-4 rounded-md">
      <h3 className="text-lg font-medium">{initialData ? 'Edit Org Unit' : 'Create New Org Unit'}</h3>
      
      <div className="space-y-2">
        <Label htmlFor="unit-name">Unit Name</Label>
        <Input id="unit-name" {...register('name')} placeholder="e.g. Engineering, Sales" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="parent-unit">Parent Unit</Label>
        <Select
          value={parentId?.toString() || 'none'}
          onValueChange={(val) => setValue('parent_id', val === 'none' ? null : Number(val))}
        >
          <SelectTrigger id="parent-unit">
            <SelectValue placeholder="None (Root)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (Root)</SelectItem>
            {parentOptions.map((u) => (
              <SelectItem key={u.id} value={u.id.toString()}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reporting-period">Reporting Period</Label>
        <Select
          value={reportingPeriod}
          onValueChange={(val: any) => setValue('reporting_period', val)}
        >
          <SelectTrigger id="reporting-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Bi-weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : initialData ? 'Update Unit' : 'Create Unit'}
        </Button>
      </div>
    </form>
  );
}
