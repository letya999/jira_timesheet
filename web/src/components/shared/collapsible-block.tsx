import { useId } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface CollapsibleBlockProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CollapsibleBlock({
  title,
  icon,
  children,
  defaultOpen = true,
  open,
  onOpenChange,
}: CollapsibleBlockProps) {
  const titleId = useId()

  return (
    <Collapsible defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange}>
      <Card className="bg-card/70">
        <CardHeader className="border-b pb-4">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-labelledby={titleId}
              className="group/collapsible flex w-full items-center justify-start gap-2 text-left text-base font-semibold"
            >
              <ChevronUp className="size-4 group-data-[state=closed]/collapsible:hidden" />
              <ChevronDown className="hidden size-4 group-data-[state=closed]/collapsible:block" />
              {icon}
              <CardTitle id={titleId} className="text-base font-semibold">
                {title}
              </CardTitle>
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-5">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
