import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormField } from '@/components/shared/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  createManualLogApiV1TimesheetManualPost,
  getEmployeesApiV1OrgEmployeesGet,
  searchProjectIssuesApiV1ProjectsIssuesGet,
} from '@/api/generated/sdk.gen'
import { useCurrentUser } from '@/features/auth/hooks'
import { useReportCategories } from '@/features/reports/hooks'
import { useDebounce } from '@/hooks/use-debounce'
import { dateUtils } from '@/lib/date-utils'
import { toast } from '@/lib/toast'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { timesheetKeys } from '@/features/timesheet/hooks'
import { Check, ChevronsUpDown } from 'lucide-react'

interface LogTimeFormProps {
  className?: string
  onSubmitted?: () => void
  showStandaloneLink?: boolean
}

type WorklogType = 'JIRA' | 'MANUAL'

interface EmployeeOption {
  id: number
  display_name: string
  email?: string | null
}

interface IssueOption {
  id: number
  key: string
  summary: string
}

interface SearchOption {
  value: string
  label: string
  searchText: string
}

interface SearchableSelectProps {
  options: SearchOption[]
  value?: string
  onChange: (value: string) => void
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  searchValue?: string
  onSearchValueChange?: (value: string) => void
  disabled?: boolean
}

function parseIssueOptions(data: unknown): IssueOption[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const candidate = item as Record<string, unknown>
      const id = typeof candidate.id === 'number' ? candidate.id : null
      const key = typeof candidate.key === 'string' ? candidate.key : null
      const summary = typeof candidate.summary === 'string' ? candidate.summary : ''

      if (!id || !key) {
        return null
      }

      return { id, key, summary }
    })
    .filter((item): item is IssueOption => item !== null)
}

function normalizeIssueSearch(search: string): string {
  const trimmed = search.trim()
  if (!trimmed) return ''

  const decoded = (() => {
    try {
      return decodeURIComponent(trimmed)
    } catch {
      return trimmed
    }
  })()

  const match = decoded.match(/([A-Z][A-Z0-9]+-\d+)/i)
  if (match?.[1]) {
    return match[1].toUpperCase()
  }

  return decoded
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  searchValue,
  onSearchValueChange,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)

  const selected = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate text-left">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={onSearchValueChange}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.searchText}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('mr-2 size-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function LogTimeForm({ className, onSubmitted, showStandaloneLink = false }: LogTimeFormProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const today = useMemo(() => dateUtils.formatPlain(dateUtils.now(), 'yyyy-MM-dd'), [])

  const { data: currentUser } = useCurrentUser()
  const { data: categories = [] } = useReportCategories()

  const [employeeId, setEmployeeId] = useState('')
  const [worklogType, setWorklogType] = useState<WorklogType>('JIRA')
  const [issueSearch, setIssueSearch] = useState('')
  const [issueId, setIssueId] = useState('')
  const [date, setDate] = useState(today)
  const [startedAt, setStartedAt] = useState('')
  const [hours, setHours] = useState('1')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const normalizedIssueSearch = useMemo(() => normalizeIssueSearch(issueSearch), [issueSearch])
  const debouncedIssueSearch = useDebounce(normalizedIssueSearch, 400)

  const employeesQuery = useQuery({
    queryKey: ['timesheet', 'log-time', 'employees'],
    queryFn: async () => {
      const res = await getEmployeesApiV1OrgEmployeesGet({
        throwOnError: true,
        query: { page: 1, size: 500 },
      })
      const payload = res.data as { items?: EmployeeOption[] }
      return payload.items ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const issueSearchQuery = useQuery({
    queryKey: ['timesheet', 'log-time', 'issues', debouncedIssueSearch],
    enabled: worklogType === 'JIRA' && debouncedIssueSearch.length >= 2,
    queryFn: async () => {
      const res = await searchProjectIssuesApiV1ProjectsIssuesGet({
        throwOnError: true,
        query: { search: debouncedIssueSearch },
      })
      return parseIssueOptions(res.data)
    },
  })

  const createWorklogMutation = useMutation({
    mutationFn: async () => {
      const jiraCategory = 'Development'
      const parsedHours = Number.parseFloat(hours)
      const description = startedAt ? `${startedAt} - ${title.trim()}` : title.trim()

      const body = {
        date,
        hours: parsedHours,
        category: worklogType === 'MANUAL' ? category : jiraCategory,
        description,
        user_id: employeeId ? Number(employeeId) : undefined,
        issue_id: worklogType === 'JIRA' ? Number(issueId) : undefined,
      }

      const res = await createManualLogApiV1TimesheetManualPost({
        throwOnError: true,
        body,
      })

      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all() })
      toast.success(
        t('journal.added_success', {
          hours,
          category: worklogType === 'MANUAL' ? category : t('common.category_dev'),
        }),
      )
      setIssueSearch('')
      setIssueId('')
      setStartedAt('')
      setHours('1')
      setTitle('')
      setSubmitError(null)
      onSubmitted?.()
    },
    onError: () => {
      toast.error(t('journal.failed_to_add'))
      setSubmitError(t('journal.failed_to_add'))
    },
  })

  useEffect(() => {
    if (employeeId) return

    const myJiraId = (currentUser as { jira_user_id?: number | null } | undefined)?.jira_user_id
    const employees = employeesQuery.data ?? []

    if (myJiraId && employees.some((employee) => employee.id === myJiraId)) {
      setEmployeeId(String(myJiraId))
      return
    }

    if (employees.length > 0) {
      setEmployeeId(String(employees[0].id))
    }
  }, [currentUser, employeeId, employeesQuery.data])

  useEffect(() => {
    if (worklogType === 'MANUAL') {
      if (category) return
      const firstCategory = categories[0]?.name ?? 'Development'
      if (firstCategory) {
        setCategory(firstCategory)
      }
      return
    }

    setCategory('')
  }, [categories, category, worklogType])

  useEffect(() => {
    setIssueId('')
  }, [worklogType, issueSearch])

  const issueOptions = issueSearchQuery.data ?? []
  const employeeOptions = useMemo<SearchOption[]>(
    () =>
      (employeesQuery.data ?? []).map((employee) => {
        const emailPart = employee.email ? ` (${employee.email})` : ''
        return {
          value: String(employee.id),
          label: `${employee.display_name}${emailPart}`,
          searchText: `${employee.display_name} ${employee.email ?? ''}`.toLowerCase(),
        }
      }),
    [employeesQuery.data],
  )

  const issueSelectOptions = useMemo<SearchOption[]>(
    () =>
      issueOptions.map((issue) => ({
        value: String(issue.id),
        label: `${issue.key} - ${issue.summary || t('common.na')}`,
        searchText: `${issue.key} ${issue.summary}`.toLowerCase(),
      })),
    [issueOptions, t],
  )

  const manualCategoryOptions = useMemo(() => {
    const defaults = [
      { key: 'common.category_dev', value: 'Development' },
      { key: 'common.category_meet', value: 'Meeting' },
      { key: 'common.category_doc', value: 'Documentation' },
      { key: 'common.category_design', value: 'Design' },
      { key: 'common.category_other', value: 'Other' },
    ]

    const fromApi = (categories ?? []).map((item) => item.name)
    const uniqueValues = Array.from(new Set([...defaults.map((item) => item.value), ...fromApi]))

    return uniqueValues.map((value) => {
      const fromDefaults = defaults.find((item) => item.value === value)
      return {
        value,
        label: fromDefaults ? t(fromDefaults.key) : value,
      }
    })
  }, [categories, t])

  const parsedHours = Number.parseFloat(hours)
  const hasValidHours = !Number.isNaN(parsedHours) && parsedHours > 0 && parsedHours <= 24
  const hasRequiredFields =
    !!employeeId &&
    !!date &&
    hasValidHours &&
    title.trim().length > 0 &&
    (worklogType === 'JIRA' ? !!issueId : !!category)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!employeeId) {
      setSubmitError(t('web.timesheet.employee_required', { defaultValue: 'Please select an employee.' }))
      return
    }

    if (!date) {
      setSubmitError(t('web.timesheet.date_required', { defaultValue: 'Please select a date.' }))
      return
    }

    const parsedHours = Number.parseFloat(hours)
    if (Number.isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
      setSubmitError(t('web.timesheet.hours_validation', { defaultValue: 'Hours must be between 0 and 24.' }))
      return
    }

    if (!title.trim()) {
      setSubmitError(t('web.timesheet.title_required', { defaultValue: 'Please enter a title.' }))
      return
    }

    if (worklogType === 'JIRA' && !issueId) {
      setSubmitError(t('journal.select_task_error'))
      return
    }

    if (worklogType === 'MANUAL' && !category) {
      setSubmitError(t('web.timesheet.category_required', { defaultValue: 'Please select a category.' }))
      return
    }

    setSubmitError(null)
    createWorklogMutation.mutate()
  }

  return (
    <form className={cn('space-y-4', className)} onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label={t('common.employee')} required>
          <SearchableSelect
            options={employeeOptions}
            value={employeeId}
            onChange={setEmployeeId}
            placeholder={t('web.timesheet.select_employee', { defaultValue: 'Select employee' })}
            searchPlaceholder={t('web.timesheet.search_employee', { defaultValue: 'Search by name or email...' })}
            emptyText={t('common.not_found')}
            disabled={employeesQuery.isLoading}
          />
        </FormField>

        <FormField label={t('common.type')} required>
          <Select value={worklogType} onValueChange={(value) => setWorklogType(value as WorklogType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="JIRA">{t('journal.type_jira')}</SelectItem>
              <SelectItem value="MANUAL">{t('journal.type_manual')}</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {worklogType === 'JIRA' && (
        <FormField label={t('journal.select_task')} description={t('journal.task_search_hint')} required>
          <SearchableSelect
            options={issueSelectOptions}
            value={issueId}
            onChange={setIssueId}
            placeholder={t('journal.select_task')}
            searchPlaceholder={t('web.timesheet.task_search_placeholder', { defaultValue: 'Issue key, title or Jira URL' })}
            searchValue={issueSearch}
            onSearchValueChange={setIssueSearch}
            emptyText={
              issueSearch.trim().length < 2
                ? t('web.timesheet.issue_search_min', { defaultValue: 'Enter at least 2 characters' })
                : issueSearchQuery.isFetching
                  ? t('common.loading')
                  : t('journal.no_tasks')
            }
          />
        </FormField>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label={t('common.date')} required>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </FormField>

        <FormField label={t('web.timesheet.start_time_optional', { defaultValue: 'Start time (optional)' })}>
          <Input type="time" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label={t('common.hours')} required>
          <Input
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
          />
        </FormField>

        {worklogType === 'MANUAL' ? (
          <FormField label={t('common.category')} required>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t('web.timesheet.select_category', { defaultValue: 'Select category' })} />
              </SelectTrigger>
              <SelectContent>
                {manualCategoryOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        ) : (
          <FormField label={t('web.timesheet.jira_category', { defaultValue: 'Category' })}>
            <Input value={t('common.category_dev')} readOnly disabled />
          </FormField>
        )}
      </div>

      <FormField label={t('web.timesheet.worklog_title', { defaultValue: 'Title' })} required>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t('web.timesheet.worklog_title_placeholder', { defaultValue: 'What did you do?' })}
        />
      </FormField>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {showStandaloneLink && (
          <Button type="button" variant="outline" asChild>
            <Link to="/log-time">{t('web.timesheet.open_full_page', { defaultValue: 'Open full page' })}</Link>
          </Button>
        )}
        <Button type="submit" disabled={!hasRequiredFields || createWorklogMutation.isPending || employeesQuery.isLoading}>
          {createWorklogMutation.isPending ? t('journal.submitting') : t('journal.submit_worklog')}
        </Button>
      </div>
    </form>
  )
}
