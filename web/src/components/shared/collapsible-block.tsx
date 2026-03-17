import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'

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
  const isControlled = open !== undefined
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = isControlled ? open : internalOpen

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <Card className="bg-card/70">
        <CardHeader className="border-b pb-4">
          <button
            type="button"
            aria-labelledby={titleId}
            onClick={() => handleOpenChange(!isOpen)}
            className="flex w-full items-center justify-start gap-2 text-left text-base font-semibold"
          >
            {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {icon}
            <CardTitle id={titleId} className="text-base font-semibold">
              {title}
            </CardTitle>
          </button>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-5">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
