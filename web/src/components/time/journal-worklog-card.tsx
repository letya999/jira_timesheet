import type { WorklogResponse } from '@/api/generated/types.gen'
import { JiraIssueLine } from '@/components/jira/jira-issue-line'
import { JiraUserChip } from '@/components/jira/jira-user-chip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dateUtils } from '@/lib/date-utils'
import { useTranslation } from 'react-i18next'

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

export function JournalWorklogCard({ log }: JournalWorklogCardProps) {
  const { t } = useTranslation()

  return (
    <Card className="bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          <JiraUserChip userName={log.user_name} jiraAccountId={log.jira_account_id} />
          {' '}
          {t('ui.logged_hours', { hours: log.hours })}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-4">
        <JiraIssueLine
          issueKey={log.issue_key}
          summary={log.issue_summary}
          fallback={log.description || t('common.not_found')}
        />
        <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{t('common.project')}:</span>
          <span>{log.project_name || t('common.na')}</span>
          <span>|</span>
          <span className="font-medium text-foreground">{t('common.category')}:</span>
          <span>{log.category_name || log.category || t('common.na')}</span>
        </div>
        <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground md:grid-cols-2">
          <div>
            <span className="font-medium text-foreground">{t('ui.logged_at')}</span>{' '}
            {formatApiDate(log.source_created_at || log.created_at)}
          </div>
          <div>
            <span className="font-medium text-foreground">{t('ui.work_date')}</span> {log.date}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
