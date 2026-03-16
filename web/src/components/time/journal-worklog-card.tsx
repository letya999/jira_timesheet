import type { WorklogResponse } from '@/api/generated/types.gen'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dateUtils } from '@/lib/date-utils'

interface JournalWorklogCardProps {
  log: WorklogResponse
}

function formatApiDate(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return dateUtils.formatPlain(value, 'yyyy-MM-dd HH:mm')
  } catch {
    return '—'
  }
}

function getIssueTitle(log: WorklogResponse) {
  if (log.issue_key && log.issue_key !== 'N/A') {
    if (log.issue_summary) return `${log.issue_key} ${log.issue_summary}`
    return log.issue_key
  }
  if (log.issue_summary) return log.issue_summary
  return log.description || 'Без названия'
}

export function JournalWorklogCard({ log }: JournalWorklogCardProps) {
  return (
    <Card className="bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          <span className="text-primary underline underline-offset-2">{log.user_name || 'Unknown'}</span>{' '}
          записал(а) {log.hours}ч
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pb-5">
        <div className="text-2xl font-semibold">{getIssueTitle(log)}</div>
        <div className="flex flex-wrap items-center gap-1 text-base text-muted-foreground">
          <span className="font-semibold text-foreground">Проект:</span>
          <span>{log.project_name || 'N/A'}</span>
          <span>|</span>
          <span className="font-semibold text-foreground">Категория:</span>
          <span>{log.category_name || log.category || 'N/A'}</span>
        </div>
        <div className="grid grid-cols-1 gap-1 text-lg md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Записано:</span>
            <span>{formatApiDate(log.source_created_at || log.created_at)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Дата работы: {log.date}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
