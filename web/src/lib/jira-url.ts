const JIRA_BASE_URL = (import.meta.env.VITE_JIRA_URL as string | undefined) ?? ''

export function jiraIssueUrl(key: string | null | undefined): string | undefined {
  if (!JIRA_BASE_URL || !key || key === 'N/A') return undefined
  return `${JIRA_BASE_URL}/browse/${key}`
}

export function jiraUserUrl(accountId: string | null | undefined): string | undefined {
  if (!JIRA_BASE_URL || !accountId) return undefined
  return `${JIRA_BASE_URL}/jira/people/${accountId}`
}
