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

type UserColumn = {
  key: 'id' | 'full_name' | 'email' | 'role' | 'jira_user_id' | 'weekly_quota'
  label: string
}

const USER_COLUMNS: UserColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'jira_user_id', label: 'Jira User ID' },
  { key: 'weekly_quota', label: 'Weekly Quota' },
]

function currentYearDateRange() {
  const year = new Date().getFullYear()
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    year,
  }
}

export default function SettingsPage() {
  const { data: user } = useCurrentUser()
  const storeUser = useAuthStore((state) => state.user)
  const permissions = useAuthStore((state) => state.permissions)
  const roleFromProfile = ((user as { role?: string } | undefined)?.role ?? '').toLowerCase()
  const roleFromStore = ((storeUser as { role?: string } | null)?.role ?? '').toLowerCase()
  const hasAdminRole = roleFromProfile === 'admin' || roleFromProfile === 'ceo' || roleFromStore === 'admin' || roleFromStore === 'ceo'
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
      toast.success(`Country updated to ${countryCode}`)
      queryClient.invalidateQueries({ queryKey: ['settings', 'country'] })
      queryClient.invalidateQueries({ queryKey: ['settings', 'holidays'] })
    },
    onError: () => toast.error('Failed to update country'),
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
      toast.success('Holidays synced')
      queryClient.invalidateQueries({ queryKey: ['settings', 'holidays'] })
    },
    onError: () => toast.error('Failed to sync holidays'),
  })

  const addHolidayMutation = useMutation({
    mutationFn: async (payload: { date: string; name: string; is_holiday: boolean }) => {
      await addCustomHolidayApiV1CalendarHolidaysPost({
        throwOnError: true,
        body: payload,
      })
    },
    onSuccess: () => {
      toast.success('Holiday saved')
      setNewHolidayName('')
      queryClient.invalidateQueries({ queryKey: ['settings', 'holidays'] })
    },
    onError: () => toast.error('Failed to save holiday'),
  })

  const deleteHolidayMutation = useMutation({
    mutationFn: async (holidayDate: string) => {
      await deleteHolidayApiV1CalendarHolidaysHolidayDateDelete({
        throwOnError: true,
        path: { holiday_date: holidayDate },
      })
    },
    onSuccess: () => {
      toast.success('Holiday deleted')
      queryClient.invalidateQueries({ queryKey: ['settings', 'holidays'] })
    },
    onError: () => toast.error('Failed to delete holiday'),
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
      toast.success('Password updated')
    },
    onError: () => toast.error('Failed to update password'),
  })

  const handlePasswordUpdate = () => {
    if (newPassword.trim().length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    changePasswordMutation.mutate(newPassword.trim())
  }

  const handleSyncUsers = () => {
    syncUsersMutation.mutate(undefined, {
      onSuccess: () => toast.success('Jira users sync started'),
      onError: () => toast.error('Failed to start Jira sync'),
    })
  }

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate(undefined, {
      onSuccess: () => toast.success('All notifications marked as read'),
      onError: () => toast.error('Failed to mark notifications as read'),
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
      toast.error('Holiday name is required')
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

  const visibleUserColumns = useMemo(
    () => USER_COLUMNS.filter((column) => usersItems.some((item) => column.key in item)),
    [usersItems],
  )

  const currentYear = defaults.year
  const jiraUrl = import.meta.env.VITE_JIRA_URL ?? 'Not configured'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage profile, integrations, and workspace preferences.
        </p>
      </div>

      <Tabs defaultValue={canManageSettings ? 'admin' : 'profile'} className="w-full">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserRound className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="size-4" />
            Notifications
          </TabsTrigger>
          {canManageSettings && (
            <TabsTrigger value="org" className="flex items-center gap-2">
              <Building2 className="size-4" />
              Org
            </TabsTrigger>
          )}
          {canManageSettings && (
            <TabsTrigger value="jira" className="flex items-center gap-2">
              <LinkIcon className="size-4" />
              Jira Integration
            </TabsTrigger>
          )}
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Shield className="size-4" />
            Admin Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Account details and password update.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Username">
                  <Input value={storeUser?.username ?? ''} readOnly />
                </FormField>
                <FormField label="Email">
                  <Input value={user?.email ?? storeUser?.email ?? ''} readOnly />
                </FormField>
              </div>
              <div className="max-w-md space-y-3">
                <Label htmlFor="new-password" className="flex items-center gap-2">
                  <KeyRound className="size-4" />
                  Change Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button
                  onClick={handlePasswordUpdate}
                  disabled={changePasswordMutation.isPending}
                >
                  Update password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Delivery options and inbox controls.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Email notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Send important updates to your email.
                  </p>
                </div>
                <Switch checked={notifyByEmail} onCheckedChange={setNotifyByEmail} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Approval reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Notify when approvals are pending.
                  </p>
                </div>
                <Switch
                  checked={notifyOnApprovals}
                  onCheckedChange={setNotifyOnApprovals}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  Unread notifications:{' '}
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
                  Mark all as read
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canManageSettings && (
          <TabsContent value="org" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Org</CardTitle>
                <CardDescription>Instance-level organization settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Org units configured: {orgUnits.length}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canManageSettings && (
          <TabsContent value="jira" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Jira Integration</CardTitle>
                <CardDescription>
                  Manage user sync from Jira and integration health.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleSyncUsers} disabled={syncUsersMutation.isPending}>
                  <RefreshCw
                    className={`mr-2 size-4 ${syncUsersMutation.isPending ? 'animate-spin' : ''}`}
                  />
                  Sync users from Jira
                </Button>
                <p className="text-sm text-muted-foreground">
                  This action refreshes Jira users and updates employee mappings.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="admin" className="pt-4">
          {canManageSettings ? (
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>
                  Streamlit parity for production calendar and system users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="system-users" className="w-full">
                  <TabsList>
                    <TabsTrigger value="system-users">System Users</TabsTrigger>
                    <TabsTrigger value="calendar">Production Calendar</TabsTrigger>
                  </TabsList>

                  <TabsContent value="system-users" className="space-y-4 pt-4">
                    <div className="text-sm text-muted-foreground">Total system users: {usersTotal}</div>

                    {usersQuery.isLoading ? (
                      <div className="text-sm text-muted-foreground">Loading system users...</div>
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
                              Page {usersPage} of {usersTotalPages}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setUsersPage(1)}
                                disabled={usersPage === 1}
                              >
                                First
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
                                disabled={usersPage === 1}
                              >
                                Prev
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setUsersPage((prev) => Math.min(usersTotalPages, prev + 1))}
                                disabled={usersPage >= usersTotalPages}
                              >
                                Next
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setUsersPage(usersTotalPages)}
                                disabled={usersPage >= usersTotalPages}
                              >
                                Last
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No system users found.</div>
                    )}

                    <p className="text-sm text-muted-foreground">
                      System users are managed through authentication and employee sync flows.
                    </p>
                  </TabsContent>

                  <TabsContent value="calendar" className="space-y-6 pt-4">
                    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Instance country</Label>
                          <Select
                            value={selectedCountry}
                            onValueChange={setSelectedCountry}
                            disabled={countryQuery.isLoading || setCountryMutation.isPending}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
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
                          Update country
                        </Button>

                        <div className="space-y-2 border-t pt-4">
                          <h3 className="font-semibold">Actions</h3>
                          <Button
                            variant="outline"
                            onClick={() => syncHolidaysMutation.mutate(undefined)}
                            disabled={syncHolidaysMutation.isPending}
                            className="w-full"
                          >
                            Sync current year
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => syncHolidaysMutation.mutate(currentYear + 1)}
                            disabled={syncHolidaysMutation.isPending}
                            className="w-full"
                          >
                            Sync next year
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold">Holidays</h3>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="holidays-from">From</Label>
                            <Input
                              id="holidays-from"
                              type="date"
                              value={holidayStartDate}
                              onChange={(e) => setHolidayStartDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="holidays-to">To</Label>
                            <Input
                              id="holidays-to"
                              type="date"
                              value={holidayEndDate}
                              onChange={(e) => setHolidayEndDate(e.target.value)}
                            />
                          </div>
                        </div>

                        {holidaysQuery.isLoading ? (
                          <div className="text-sm text-muted-foreground">Loading holidays...</div>
                        ) : sortedHolidays.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Holiday</TableHead>
                                <TableHead>Custom</TableHead>
                                <TableHead>Country</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedHolidays.map((holiday: HolidayResponse) => (
                                <TableRow key={`${holiday.date}-${holiday.name}`}>
                                  <TableCell>{holiday.date}</TableCell>
                                  <TableCell>{holiday.name}</TableCell>
                                  <TableCell>{holiday.is_holiday ? 'Yes' : 'No'}</TableCell>
                                  <TableCell>{holiday.is_custom ? 'Yes' : 'No'}</TableCell>
                                  <TableCell>{holiday.country_code ?? '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-sm text-muted-foreground">Not found.</div>
                        )}

                        <div className="space-y-3 rounded-lg border p-4">
                          <h4 className="font-medium">Add/Update Custom Holiday</h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="new-holiday-date">Date</Label>
                              <Input
                                id="new-holiday-date"
                                type="date"
                                value={newHolidayDate}
                                onChange={(e) => setNewHolidayDate(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-holiday-name">Name</Label>
                              <Input
                                id="new-holiday-name"
                                value={newHolidayName}
                                onChange={(e) => setNewHolidayName(e.target.value)}
                                placeholder="Holiday name"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-md border p-3">
                            <Label htmlFor="new-holiday-is-holiday">Is holiday</Label>
                            <Switch
                              id="new-holiday-is-holiday"
                              checked={newHolidayIsHoliday}
                              onCheckedChange={setNewHolidayIsHoliday}
                            />
                          </div>
                          <Button onClick={handleAddHoliday} disabled={addHolidayMutation.isPending}>
                            Save
                          </Button>
                        </div>

                        <div className="space-y-3 rounded-lg border p-4">
                          <h4 className="font-medium">Remove Custom Holiday</h4>
                          <div className="space-y-2">
                            <Label htmlFor="delete-holiday-date">Date</Label>
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
                            Delete
                          </Button>
                        </div>

                        <div className="space-y-1 border-t pt-4 text-sm">
                          <p>Jira URL: {jiraUrl}</p>
                          <p className="text-muted-foreground">More configuration options coming soon.</p>
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
                  Admin settings
                </CardTitle>
                <CardDescription>
                  You can open this tab, but full admin controls require `settings.manage` (or admin account).
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>

    </div>
  )
}
