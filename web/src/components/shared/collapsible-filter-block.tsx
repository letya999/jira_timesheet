import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { CollapsibleBlock } from '@/components/shared/collapsible-block'

interface CollapsibleFilterBlockProps {
  children: ReactNode
  title?: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CollapsibleFilterBlock({
  children,
  title = 'Фильтры и Поиск',
  defaultOpen = true,
  open,
  onOpenChange,
}: CollapsibleFilterBlockProps) {
  return (
    <CollapsibleBlock
      title={title}
      icon={<Search className="size-4 text-primary" />}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
    </CollapsibleBlock>
  )
}
