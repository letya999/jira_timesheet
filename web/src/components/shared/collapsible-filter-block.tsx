import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { CollapsibleBlock } from '@/components/shared/collapsible-block'
import { useTranslation } from 'react-i18next'

interface CollapsibleFilterBlockProps {
  children: ReactNode
  title?: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CollapsibleFilterBlock({
  children,
  title,
  defaultOpen = true,
  open,
  onOpenChange,
}: CollapsibleFilterBlockProps) {
  const { t } = useTranslation()

  return (
    <CollapsibleBlock
      title={title ?? t('journal.filters_search')}
      icon={<Search className="size-4 text-primary" />}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
    </CollapsibleBlock>
  )
}
