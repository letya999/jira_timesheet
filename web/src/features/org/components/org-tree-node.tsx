import * as React from 'react';
import { OrgUnitResponse } from '@/features/org/schemas';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Building2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface OrgTreeNodeProps {
  unit: OrgUnitResponse;
  allUnits: OrgUnitResponse[];
  level?: number;
  isLast?: boolean;
}

export function OrgTreeNode({ unit, allUnits, level = 0, isLast = false }: OrgTreeNodeProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const children = allUnits.filter((u) => u.parent_id === unit.id);
  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col">
      <div className="relative flex items-center group">
        {/* Connection lines for nested levels */}
        {level > 0 && (
          <div 
            className="absolute left-[-1.5rem] top-[-0.5rem] bottom-0 w-px bg-border" 
            style={{ left: `-${1.5}rem` }}
          />
        )}
        
        {/* Horizontal line to the node */}
        {level > 0 && (
          <div 
            className="absolute left-[-1.5rem] top-1/2 w-4 h-px bg-border"
          />
        )}

        <div 
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-md transition-colors w-full",
            "hover:bg-accent/50 group-hover:bg-accent/30",
            level === 0 ? "bg-card border shadow-sm" : "ml-2"
          )}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-5 w-5 p-0 hover:bg-transparent"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          ) : (
            <div className="w-5" />
          )}

          {level === 0 ? (
            <Building2 className="h-4 w-4 text-primary" />
          ) : (
            <Layers className="h-3.5 w-3.5 text-muted-foreground/70" />
          )}

          <div className="flex flex-col min-w-0">
            <span className={cn(
              "font-medium truncate",
              level === 0 ? "text-sm" : "text-xs"
            )}>
              {unit.name}
            </span>
          </div>

          <Badge 
            variant="outline" 
            className="ml-auto text-[10px] h-4 px-1 font-normal text-muted-foreground bg-muted/20"
          >
            {unit.reporting_period}
          </Badge>
        </div>
      </div>

      {hasChildren && isOpen && (
        <div 
          className="ml-6 flex flex-col relative"
          style={{ paddingLeft: '0.5rem' }}
        >
          {/* Vertical line connecting children */}
          <div className="absolute left-0 top-0 bottom-4 w-px bg-border" />
          
          <div className="space-y-1 pt-1">
            {children.map((child, index) => (
              <OrgTreeNode 
                key={child.id} 
                unit={child} 
                allUnits={allUnits} 
                level={level + 1}
                isLast={index === children.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
