import { ExternalLink, Ticket } from 'lucide-react'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { jiraIssueUrl } from '@/lib/jira-url'

interface JiraIssueLineProps {
  issueKey: string | null | undefined
  summary?: string | null
  fallback?: string
  className?: string
}

export function JiraIssueLine({ issueKey, summary, fallback = 'Без названия', className }: JiraIssueLineProps) {
  const href = jiraIssueUrl(issueKey)
  const hasKey = issueKey && issueKey !== 'N/A'

  if (!hasKey) {
    return (
      <span className={cn('text-sm font-semibold', className)}>
        {summary || fallback}
      </span>
    )
  }

  const keyNode = (
    <span className={cn('inline-flex items-center gap-1 shrink-0', href ? 'text-primary group/issue-line' : 'text-muted-foreground')}>
      <Ticket className="size-3.5 text-[#0052CC] shrink-0" />
      <Typography variant="mono" as="span" className="text-sm font-medium">
        {issueKey}
      </Typography>
      {href && <ExternalLink className="size-3 opacity-0 group-hover/issue-line:opacity-50 transition-opacity" />}
    </span>
  )

  return (
    <div className={cn('flex flex-wrap items-baseline gap-2 text-sm font-semibold', className)}>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="hover:underline">
          {keyNode}
        </a>
      ) : (
        keyNode
      )}
      {summary && <span>{summary}</span>}
    </div>
  )
}
