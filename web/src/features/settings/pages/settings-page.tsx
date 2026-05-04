import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/features/auth/hooks'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgTree } from '@/features/org/hooks'
import { useSyncUsersFromJira } from '@/features/users/hooks'
import { useMarkAllRead, useNotificationStats } from '@/features/notifications/hooks'
import {
  addCustomHolidayApiV1CalendarHolidaysPost,
  changePasswordApiV1UsersChangePasswordPost,
  deleteHolidayApiV1CalendarHolidaysHolidayDateDelete,
  getCountryApiV1CalendarCountryGet,
  getHolidaysApiV1CalendarHolidaysGet,
  getUsersApiV1UsersGet,
  setCountryApiV1CalendarCountryPost,
  syncHolidaysApiV1CalendarHolidaysSyncPost,
} from '@/api/generated/sdk.gen'
import type { HolidayResponse, UserResponse } from '@/api/generated/types.gen'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FormField } from '@/components/shared/form-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Building2,
  Bell,
  UserRound,
  KeyRound,
  RefreshCw,
  Settings2,
  Link as LinkIcon,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { isAdminRole } from '@/lib/rbac'

const COUNTRY_NAMES: Record<string, string> = {
  RU: 'Russia',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  KZ: 'Kazakhstan',
  BY: 'Belarus',
  UA: 'Ukraine',
  AE: 'United Arab Emirates',
  UZ: 'Uzbekistan',
}

const COUNTRY_OPTIONS = Object.keys(COUNTRY_NAMES)
const USER_PAGE_SIZE = 20

const ACCESS_MATRIX = [
  { page: '/app/dashboard', admin: true, manager: true, employee: false },
  { page: '/app/journal', admin: true, manager: true, employee: true },
  { page: '/app/my-timesheet', admin: true, manager: true, employee: true },
  { page: '/app/employees', admin: true, manager: true, employee: true },
  { page: '/app/projects', admin: true, manager: true, employee: false },
  { page: '/app/reports', admin: true, manager: true, employee: false },
  { page: '/app/approvals', admin: true, manager: true, employee: false },
  { page: '/app/leave (overview)', admin: true, manager: true, employee: true },
  { page: '/app/leave (management)', admin: true, manager: true, employee: false },
  { page: '/app/settings: Profile', admin: true, manager: true, employee: true },
  { page: '/app/settings: Notifications', admin: true, manager: true, employee: true },
  { page: '/app/settings: Admin/Org/Jira/Access', admin: true, manager: false, employee: false },
]

type UserColumn = {
  key: 'id' | 'full_name' | 'email' | 'role' | 'jira_user_id' | 'weekly_quota'
  label: string
}

function currentYearDateRange() {
  const year = new Date().getFullYear()
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    year,
  }
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { data: user } = useCurrentUser()
  const storeUser = useAuthStore((state) => state.user)
  const permissions = useAuthStore((state) => state.permissions)
  const roleFromProfile = (user as { role?: string } | undefined)?.role
  const roleFromStore = (storeUser as { role?: string } | null)?.role
  const hasAdminRole = isAdminRole(roleFromProfile) || isAdminRole(roleFromStore)
  const canManageSettings =
    permissions.includes('settings.manage') || Boolean(storeUser?.is_admin) || hasAdminRole
  const { data: orgUnits = [] } = useOrgTree()
  const { data: notificationStats } = useNotificationStats()
  const syncUsersMutation = useSyncUsersFromJira()
  const markAllReadMutation = useMarkAllRead()

  const [newPassword, setNewPassword] = useState('')
  const [notifyByEmail, setNotifyByEmail] = useState(true)
  const [notifyOnApprovals, setNotifyOnApprovals] = useState(true)

  const queryClient = useQueryClient()
  const defaults = useMemo(() => currentYearDateRange(), [])

  const [usersPage, setUsersPage] = useState(1)
  const [holidayStartDate, setHolidayStartDate] = useState(defaults.start)
  const [holidayEndDate, setHolidayEndDate] = useState(defaults.end)

  const [selectedCountry, setSelectedCountry] = useState('')

  const [newHolidayDate, setNewHolidayDate] = useState(defaults.start)
  const [newHolidayName, setNewHolidayName] = useState('')
  const [newHolidayIsHoliday, setNewHolidayIsHoliday] = useState(true)

  const [deleteHolidayDate, setDeleteHolidayDate] = useState(defaults.start)

  const countryQuery = useQuery({
    queryKey: ['settings', 'country'],
    queryFn: async () => {
      const response = await getCountryApiV1CalendarCountryGet({ throwOnError: true })
      return response.data.country_code
    },
    enabled: canManageSettings,
  })

  useEffect(() => {
    if (countryQuery.data) {
      setSelectedCountry(countryQuery.data)
    }
  }, [countryQuery.data])

  const setCountryMutation = useMutation({
    mutationFn: async (countryCode: string) => {
      await setCountryApiV1CalendarCountryPost({
        throwOnError: true,
        body: { country_code: countryCode },
      })
      return countryCode
    },
    onSuccess: (countryCode) => {
      toast.success(t('web.settings.country_updated_to', { country: countryCode }))
      queryClient.invalidateQueries({ queryKey: ['settings', 'country'] })
      queryClient.invalidateQueries({ queryKey: ['settings', 'holidays'] })
    },
    onError: () => toast.error(t('settings.failed_update_country')),
  })

  const usersQuery = useQuery({
    queryKey: ['settings', 'system-users', usersPage],
    queryFn: async () => {
      const response = await getUsersApiV1UsersGet({
        throwOnError: true,
        query: { page: usersPage, size: USER_PAGE_SIZE },
      })
      return response.data
    },
    enabled: canManageSettings,
  })

  const holidaysQuery = useQuery({
    queryKey: ['settings', 'holidays', holidayStartDate, holidayEndDate],
    queryFn: async () => {
      const response = await getHolidaysApiV1CalendarHolidaysGet({
        throwOnError: true,
        query: {
          start_date: holidayStartDate,
          end_date: holidayEndDate,
        },
      })
      return response.data
    },
    enabled: canManageSettings,
  })

  const syncHolidaysMutation = useMutation({
    mutationFn: async (year?: number) => {
      await syncHolidaysApiV1CalendarHolidaysSyncPost({
        throwOnError: true,
        query: typeof year === 'number' ? { year } : undefined,
      })
    },
    onSuccess: () => {
      toast.success(t('web.settings.holidays_synced'))
      queryClient.invalidateQueries({ queryKey: ['settings', 'holidays'] })
    },
    onError: () => toast.error(t('web.settings.holidays_sync_failed')),
  })

  const addHolidayMutation = useMutation({
    mutationFn: async (payload: { date: string; name: string; is_holiday: boolean }) => {
      await addCustomHolidayApiV1CalendarHolidaysPost({
        throwOnError: true,
        body: payload,
      })
    },
    onSuccess: () => {
      toast.success(t('settings.holiday_saved'))
      setNewHolidayName('')
      queryClient.invalidateQueries({ queryKey: ['settings', 'holidays'] })
    },
    onError: () => toast.error(t('web.settings.holiday_save_failed')),
  })

  const deleteHolidayMutation = useMutation({
    mutationFn: async (holidayDate: string) => {
      await deleteHolidayApiV1CalendarHolidaysHolidayDateDelete({
        throwOnError: true,
        path: { holiday_date: holidayDate },
      })
    },
    onSuccess: () => {
      toast.success(t('settings.holiday_deleted'))
      queryClient.invalidateQueries({ queryKey: ['settings', 'holidays'] })
    },
    onError: () => toast.error(t('web.settings.holiday_delete_failed')),
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      await changePasswordApiV1UsersChangePasswordPost({
        throwOnError: true,
        body: { new_password: password },
      })
    },
    onSuccess: () => {
      setNewPassword('')
      toast.success(t('web.settings.password_updated'))
    },
    onError: () => toast.error(t('web.settings.password_update_failed')),
  })

  const handlePasswordUpdate = () => {
    if (newPassword.trim().length < 8) {
      toast.error(t('web.settings.password_min_length'))
      return
    }
    changePasswordMutation.mutate(newPassword.trim())
  }

  const handleSyncUsers = () => {
    syncUsersMutation.mutate(undefined, {
      onSuccess: () => toast.success(t('web.settings.jira_sync_started')),
      onError: () => toast.error(t('web.settings.jira_sync_start_failed')),
    })
  }

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate(undefined, {
      onSuccess: () => toast.success(t('notifications.all_read_success')),
      onError: () => toast.error(t('web.settings.mark_read_failed')),
    })
  }

  const handleUpdateCountry = () => {
    if (!selectedCountry || selectedCountry === countryQuery.data) {
      return
    }
    setCountryMutation.mutate(selectedCountry)
  }

  const handleAddHoliday = () => {
    if (!newHolidayName.trim()) {
      toast.error(t('web.settings.holiday_name_required'))
      return
    }

    addHolidayMutation.mutate({
      date: newHolidayDate,
      name: newHolidayName.trim(),
      is_holiday: newHolidayIsHoliday,
    })
  }

  const sortedHolidays = useMemo(() => {
    const holidays = holidaysQuery.data ?? []
    return [...holidays].sort((a, b) => a.date.localeCompare(b.date))
  }, [holidaysQuery.data])

  const usersItems = useMemo(
    () => (usersQuery.data?.items ?? []) as Array<UserResponse & Record<string, unknown>>,
    [usersQuery.data?.items],
  )
  const usersTotal = usersQuery.data?.total ?? 0
  const usersTotalPages = usersQuery.data?.pages ?? 1

  const USER_COLUMNS: UserColumn[] = useMemo(
    () => [
      { key: 'id', label: 'ID' },
      { key: 'full_name', label: t('web.settings.full_name') },
      { key: 'email', label: t('common.email') },
      { key: 'role', label: t('common.role') },
      { key: 'jira_user_id', label: t('web.settings.jira_user_id') },
      { key: 'weekly_quota', label: t('web.settings.weekly_quota') },
    ],
    [t],
  )

  const visibleUserColumns = useMemo(
    () => USER_COLUMNS.filter((column) => usersItems.some((item) => column.key in item)),
    [USER_COLUMNS, usersItems],
  )

  const currentYear = defaults.year
  const jiraUrl = import.meta.env.VITE_JIRA_URL ?? t('web.settings.not_configured')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('common.settings')}</h1>
        <p className="text-muted-foreground">
          {t('web.settings.subtitle')}
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserRound className="size-4" />
            {t('web.settings.profile')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="size-4" />
            {t('common.notifications')}
          </TabsTrigger>
          {canManageSettings && (
            <TabsTrigger value="org" className="flex items-center gap-2">
              <Building2 className="size-4" />
              {t('web.settings.org')}
            </TabsTrigger>
          )}
          {canManageSettings && (
            <TabsTrigger value="jira" className="flex items-center gap-2">
              <LinkIcon className="size-4" />
              {t('web.settings.jira_integration')}
            </TabsTrigger>
          )}
          {canManageSettings && (
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="size-4" />
              {t('web.settings.admin_settings')}
            </TabsTrigger>
          )}
          {canManageSettings && (
            <TabsTrigger value="access" className="flex items-center gap-2">
              <Shield className="size-4" />
              {t('web.settings.access_matrix', { defaultValue: 'Access' })}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('web.settings.profile')}</CardTitle>
              <CardDescription>{t('web.settings.profile_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t('web.auth.username')}>
                  <Input value={storeUser?.username ?? ''} readOnly />
                </FormField>
                <FormField label={t('common.email')}>
                  <Input value={user?.email ?? storeUser?.email ?? ''} readOnly />
                </FormField>
              </div>
              <div className="max-w-md space-y-3">
                <Label htmlFor="new-password" className="flex items-center gap-2">
                  <KeyRound className="size-4" />
                  {t('web.settings.change_password')}
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder={t('web.settings.password_placeholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button
                  onClick={handlePasswordUpdate}
                  disabled={changePasswordMutation.isPending}
                >
                  {t('web.settings.update_password')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('common.notifications')}</CardTitle>
              <CardDescription>{t('web.settings.notifications_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{t('web.settings.email_notifications')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('web.settings.email_notifications_desc')}
                  </p>
                </div>
                <Switch checked={notifyByEmail} onCheckedChange={setNotifyByEmail} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{t('web.settings.approval_reminders')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('web.settings.approval_reminders_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifyOnApprovals}
                  onCheckedChange={setNotifyOnApprovals}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  {t('web.settings.unread_notifications')}:{' '}
                  <span className="font-semibold text-foreground">
                    {notificationStats?.unread_count ?? 0}
                  </span>
                </p>
                <Button
                  variant="outline"
                  onClick={handleMarkAllRead}
                  disabled={
                    (notificationStats?.unread_count ?? 0) === 0 ||
                    markAllReadMutation.isPending
                  }
                >
                  {t('notifications.mark_all_read')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canManageSettings && (
          <TabsContent value="org" className="pt-4">
            <Card>
              <CardHeader>
              <CardTitle>{t('web.settings.org')}</CardTitle>
              <CardDescription>{t('web.settings.org_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('web.settings.org_units_configured')}: {orgUnits.length}
              </p>
            </CardContent>
            </Card>
          </TabsContent>
        )}

        {canManageSettings && (
          <TabsContent value="jira" className="pt-4">
            <Card>
              <CardHeader>
              <CardTitle>{t('web.settings.jira_integration')}</CardTitle>
              <CardDescription>
                  {t('web.settings.jira_integration_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleSyncUsers} disabled={syncUsersMutation.isPending}>
                  <RefreshCw
                    className={`mr-2 size-4 ${syncUsersMutation.isPending ? 'animate-spin' : ''}`}
                  />
                  {t('web.settings.sync_users_from_jira')}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {t('web.settings.sync_users_hint')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="admin" className="pt-4">
          {canManageSettings ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('web.settings.admin_settings')}</CardTitle>
                <CardDescription>
                  {t('web.settings.admin_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="system-users" className="w-full">
                  <TabsList>
                    <TabsTrigger value="system-users">{t('settings.tab_users')}</TabsTrigger>
                    <TabsTrigger value="calendar">{t('settings.calendar_title')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="system-users" className="space-y-4 pt-4">
                    <div className="text-sm text-muted-foreground">{t('web.settings.total_system_users')}: {usersTotal}</div>

                    {usersQuery.isLoading ? (
                      <div className="text-sm text-muted-foreground">{t('web.settings.loading_system_users')}</div>
                    ) : usersItems.length > 0 ? (
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {visibleUserColumns.map((column) => (
                                <TableHead key={column.key}>{column.label}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {usersItems.map((item) => (
                              <TableRow key={item.id}>
                                {visibleUserColumns.map((column) => (
                                  <TableCell key={`${item.id}-${column.key}`}>
                                    {item[column.key] !== null && item[column.key] !== undefined
                                      ? String(item[column.key])
                                      : '-'}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        {usersTotalPages > 1 && (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm text-muted-foreground">
                              {t('common.page')} {usersPage} {t('common.of')} {usersTotalPages}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setUsersPage(1)}
                                disabled={usersPage === 1}
                              >
                                {t('common.first')}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
                                disabled={usersPage === 1}
                              >
                                {t('common.prev')}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setUsersPage((prev) => Math.min(usersTotalPages, prev + 1))}
                                disabled={usersPage >= usersTotalPages}
                              >
                                {t('common.next')}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setUsersPage(usersTotalPages)}
                                disabled={usersPage >= usersTotalPages}
                              >
                                {t('common.last')}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">{t('web.settings.no_system_users')}</div>
                    )}

                    <p className="text-sm text-muted-foreground">
                      {t('web.settings.system_users_note')}
                    </p>
                  </TabsContent>

                  <TabsContent value="calendar" className="space-y-6 pt-4">
                    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>{t('settings.instance_country')}</Label>
                          <Select
                            value={selectedCountry}
                            onValueChange={setSelectedCountry}
                            disabled={countryQuery.isLoading || setCountryMutation.isPending}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('web.settings.select_country')} />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRY_OPTIONS.map((code) => (
                                <SelectItem key={code} value={code}>
                                  {code} - {COUNTRY_NAMES[code]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          onClick={handleUpdateCountry}
                          disabled={
                            setCountryMutation.isPending ||
                            !selectedCountry ||
                            selectedCountry === countryQuery.data
                          }
                        >
                          {t('settings.update_country')}
                        </Button>

                        <div className="space-y-2 border-t pt-4">
                          <h3 className="font-semibold">{t('common.actions')}</h3>
                          <Button
                            variant="outline"
                            onClick={() => syncHolidaysMutation.mutate(undefined)}
                            disabled={syncHolidaysMutation.isPending}
                            className="w-full"
                          >
                            {t('settings.sync_current')}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => syncHolidaysMutation.mutate(currentYear + 1)}
                            disabled={syncHolidaysMutation.isPending}
                            className="w-full"
                          >
                            {t('settings.sync_next')}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold">{t('settings.holidays_title')}</h3>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="holidays-from">{t('common.from')}</Label>
                            <Input
                              id="holidays-from"
                              type="date"
                              value={holidayStartDate}
                              onChange={(e) => setHolidayStartDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="holidays-to">{t('common.to')}</Label>
                            <Input
                              id="holidays-to"
                              type="date"
                              value={holidayEndDate}
                              onChange={(e) => setHolidayEndDate(e.target.value)}
                            />
                          </div>
                        </div>

                        {holidaysQuery.isLoading ? (
                          <div className="text-sm text-muted-foreground">{t('web.settings.loading_holidays')}</div>
                        ) : sortedHolidays.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('common.date')}</TableHead>
                                <TableHead>{t('common.name')}</TableHead>
                                <TableHead>{t('web.settings.holiday')}</TableHead>
                                <TableHead>{t('web.settings.custom')}</TableHead>
                                <TableHead>{t('web.settings.country')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedHolidays.map((holiday: HolidayResponse) => (
                                <TableRow key={`${holiday.date}-${holiday.name}`}>
                                  <TableCell>{holiday.date}</TableCell>
                                  <TableCell>{holiday.name}</TableCell>
                                  <TableCell>{holiday.is_holiday ? t('common.yes') : t('common.no')}</TableCell>
                                  <TableCell>{holiday.is_custom ? t('common.yes') : t('common.no')}</TableCell>
                                  <TableCell>{holiday.country_code ?? '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-sm text-muted-foreground">{t('common.not_found')}.</div>
                        )}

                        <div className="space-y-3 rounded-lg border p-4">
                          <h4 className="font-medium">{t('settings.add_holiday')}</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="new-holiday-date">{t('common.date')}</Label>
                              <Input
                                id="new-holiday-date"
                                type="date"
                                value={newHolidayDate}
                                onChange={(e) => setNewHolidayDate(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-holiday-name">{t('common.name')}</Label>
                              <Input
                                id="new-holiday-name"
                                value={newHolidayName}
                                onChange={(e) => setNewHolidayName(e.target.value)}
                                placeholder={t('web.settings.holiday_name_placeholder')}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-md border p-3">
                            <Label htmlFor="new-holiday-is-holiday">{t('web.settings.is_holiday')}</Label>
                            <Switch
                              id="new-holiday-is-holiday"
                              checked={newHolidayIsHoliday}
                              onCheckedChange={setNewHolidayIsHoliday}
                            />
                          </div>
                          <Button onClick={handleAddHoliday} disabled={addHolidayMutation.isPending}>
                            {t('common.save')}
                          </Button>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4">
                          <h4 className="font-medium">{t('settings.remove_holiday')}</h4>
                          <div className="space-y-2">
                            <Label htmlFor="delete-holiday-date">{t('common.date')}</Label>
                            <Input
                              id="delete-holiday-date"
                              type="date"
                              value={deleteHolidayDate}
                              onChange={(e) => setDeleteHolidayDate(e.target.value)}
                            />
                          </div>
                          <Button
                            variant="destructive"
                            onClick={() => deleteHolidayMutation.mutate(deleteHolidayDate)}
                            disabled={deleteHolidayMutation.isPending}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>

                        <div className="space-y-1 border-t pt-4 text-sm">
                          <p>{t('web.settings.jira_url')}: {jiraUrl}</p>
                          <p className="text-muted-foreground">{t('settings.coming_soon')}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="size-4" />
                  {t('web.settings.admin_settings')}
                </CardTitle>
                <CardDescription>
                  {t('web.settings.admin_required_desc')}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        {canManageSettings && (
          <TabsContent value="access" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('web.settings.access_matrix', { defaultValue: 'Access Matrix' })}</CardTitle>
                <CardDescription>
                  {t('web.settings.access_matrix_desc', {
                    defaultValue: 'RBAC visibility and access rules by role.',
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.page')}</TableHead>
                      <TableHead>{t('common.roles.admin', 'Admin')}</TableHead>
                      <TableHead>{t('common.roles.manager', 'Manager')}</TableHead>
                      <TableHead>{t('common.roles.employee', 'Employee')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ACCESS_MATRIX.map((row) => (
                      <TableRow key={row.page}>
                        <TableCell className="font-mono text-xs">{row.page}</TableCell>
                        <TableCell>{row.admin ? t('common.yes') : t('common.no')}</TableCell>
                        <TableCell>{row.manager ? t('common.yes') : t('common.no')}</TableCell>
                        <TableCell>{row.employee ? t('common.yes') : t('common.no')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

    </div>
  )
}
