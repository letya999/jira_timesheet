import { OrgUnitResponse } from '@/features/org/schemas';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

interface OrgTreeNodeProps {
  unit: OrgUnitResponse;
  allUnits: OrgUnitResponse[];
  level?: number;
}

export function OrgTreeNode({ unit, allUnits, level = 0 }: OrgTreeNodeProps) {
  const children = allUnits.filter((u) => u.parent_id === unit.id);

  return (
    <AccordionItem value={`unit-${unit.id}`} className="border-none">
      <AccordionTrigger className="py-2 hover:no-underline">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{unit.name}</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            {unit.reporting_period}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pl-6">
        {children.length > 0 ? (
          <Accordion type="multiple">
            {children.map((child) => (
              <OrgTreeNode key={child.id} unit={child} allUnits={allUnits} level={level + 1} />
            ))}
          </Accordion>
        ) : (
          <p className="text-xs text-muted-foreground italic py-1">No sub-units</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
