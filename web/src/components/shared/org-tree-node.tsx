import * as React from "react"
import { ChevronRight, ChevronDown, Users, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface OrgUnit {
  id: number
  name: string
  type: 'ORGANIZATION' | 'DEPARTMENT' | 'TEAM'
  children?: OrgUnit[]
  memberCount?: number
}

interface OrgTreeNodeProps {
  node: OrgUnit
  level?: number
  onNodeClick?: (node: OrgUnit) => void
  defaultExpanded?: boolean
}

export function OrgTreeNode({
  node,
  level = 0,
  onNodeClick,
  defaultExpanded = false,
}: OrgTreeNodeProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)
  const hasChildren = node.children && node.children.length > 0

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const Icon = node.type === 'TEAM' ? Users : Building2

  return (
    <div className="flex flex-col">
      <div 
        className={cn(
          "flex items-center py-2 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group",
          level === 0 && "font-semibold"
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        onClick={() => onNodeClick?.(node)}
      >
        <div className="size-6 flex items-center justify-center mr-1">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-5 h-5 w-5 p-0 hover:bg-muted-foreground/20"
              onClick={toggleExpand}
            >
              {isExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </Button>
          ) : (
            <div className="size-4" />
          )}
        </div>
        <Icon className={cn(
          "size-4 mr-2",
          node.type === 'ORGANIZATION' ? "text-primary" : "text-muted-foreground"
        )} />
        <span className="flex-1 truncate text-sm">{node.name}</span>
        {node.memberCount !== undefined && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            {node.memberCount} members
          </span>
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {node.children!.map((child) => (
            <OrgTreeNode 
              key={child.id} 
              node={child} 
              level={level + 1} 
              onNodeClick={onNodeClick}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      )}
    </div>
  )
}
