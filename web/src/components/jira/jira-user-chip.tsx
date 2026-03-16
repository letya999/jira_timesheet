import { ExternalLink } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { jiraUserUrl } from '@/lib/jira-url'

interface JiraUserChipProps {
  userName: string | null | undefined
  jiraAccountId?: string | null
  className?: string
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function JiraUserChip({ userName, jiraAccountId, className }: JiraUserChipProps) {
  const displayName = userName || 'Unknown'
  const href = jiraUserUrl(jiraAccountId)

  const inner = (
    <>
      <Avatar className="size-5 shrink-0">
        <AvatarFallback className="text-[10px]">{getInitials(userName)}</AvatarFallback>
      </Avatar>
      <span className="text-primary underline underline-offset-2">{displayName}</span>
      {href && <ExternalLink className="size-3 opacity-0 group-hover/user-chip:opacity-50 transition-opacity" />}
    </>
  )

  if (!href) {
    return (
      <span className={cn('inline-flex items-center gap-1.5', className)}>
        {inner}
      </span>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors group/user-chip',
        className,
      )}
    >
      {inner}
    </a>
  )
}
