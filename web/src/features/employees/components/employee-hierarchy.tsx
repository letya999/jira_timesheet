import { JiraUserResponse } from '@/features/users/schemas';
import { OrgUnitResponse } from '@/features/org/schemas';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface EmployeeHierarchyProps {
  units: OrgUnitResponse[];
  employees: JiraUserResponse[];
}

export function EmployeeHierarchy({ units, employees }: EmployeeHierarchyProps) {
  // Build a map of employees by org unit
  const employeesByUnit = employees.reduce((acc, emp) => {
    const unitId = emp.org_unit_id || 'unassigned';
    if (!acc[unitId]) acc[unitId] = [];
    acc[unitId].push(emp);
    return acc;
  }, {} as Record<number | string, JiraUserResponse[]>);

  // Helper to render employees in a unit
  const renderEmployees = (unitId: number | 'unassigned') => {
    const unitEmployees = employeesByUnit[unitId] || [];
    if (unitEmployees.length === 0 && unitId !== 'unassigned') return null;

    return (
      <div className="flex flex-col gap-2 pl-4 py-2">
        {unitEmployees.map((emp) => (
          <div key={emp.id} className="flex items-center gap-2 py-1">
            <Avatar className="h-6 w-6">
              <AvatarImage src={emp.avatar_url || ''} alt={emp.display_name} />
              <AvatarFallback className="text-[10px]">{emp.display_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{emp.display_name}</span>
            {emp.user_id && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                System Access
              </Badge>
            )}
          </div>
        ))}
        {unitEmployees.length === 0 && unitId === 'unassigned' && (
          <span className="text-xs text-muted-foreground italic">No unassigned employees</span>
        )}
      </div>
    );
  };

  // Helper to render unit and its children recursively
  const renderUnit = (unit: OrgUnitResponse, allUnits: OrgUnitResponse[]) => {
    const children = allUnits.filter((u) => u.parent_id === unit.id);
    const hasEmployees = (employeesByUnit[unit.id] || []).length > 0;
    const hasChildren = children.length > 0;

    if (!hasEmployees && !hasChildren) return null;

    return (
      <AccordionItem key={unit.id} value={`unit-${unit.id}`} className="border-none">
        <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold">
          <div className="flex items-center gap-2">
            <span>{unit.name}</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              {unit.reporting_period}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {renderEmployees(unit.id)}
          {children.length > 0 && (
            <Accordion type="multiple" className="pl-4">
              {children.map((child) => renderUnit(child, allUnits))}
            </Accordion>
          )}
        </AccordionContent>
      </AccordionItem>
    );
  };

  const rootUnits = units.filter((u) => !u.parent_id);

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={rootUnits.map((u) => `unit-${u.id}`)}>
        {rootUnits.map((unit) => renderUnit(unit, units))}
      </Accordion>

      <div className="mt-8">
        <h3 className="text-sm font-bold mb-2 border-b pb-1">Unassigned</h3>
        {renderEmployees('unassigned')}
      </div>
    </div>
  );
}
