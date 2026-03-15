import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface FilterChip {
  id: string
  label: string
  value: string
}

interface FilterBarProps {
  filters: FilterChip[]
  onRemove: (id: string) => void
  onClear: () => void
  className?: string
}

export function FilterBar({
  filters,
  onRemove,
  onClear,
  className,
}: FilterBarProps) {
  if (filters.length === 0) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm font-medium text-muted-foreground mr-1">
        Filters:
      </span>
      {filters.map((filter) => (
        <Badge
          key={filter.id}
          variant="secondary"
          className="pl-2 pr-1 h-7 gap-1 rounded-full text-xs"
        >
          <span className="text-muted-foreground">{filter.label}:</span>
          <span>{filter.value}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-4 h-4 w-4 p-0 rounded-full hover:bg-muted-foreground/20"
            onClick={() => onRemove(filter.id)}
          >
            <X className="size-3" />
            <span className="sr-only">Remove {filter.label} filter</span>
          </Button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={onClear}
      >
        Clear all
      </Button>
    </div>
  )
}
