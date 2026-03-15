import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/features/auth/hooks'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgTree } from '@/features/org/hooks'
import { useSyncUsersFromJira } from '@/features/users/hooks'
import { useMarkAllRead, useNotificationStats } from '@/features/notifications/hooks'
import { changePasswordApiV1UsersChangePasswordPost, getCountryApiV1CalendarCountryGet, setCountryApiV1CalendarCountryPost } from '@/api/generated/sdk.gen'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/shared/form-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Bell, UserRound, KeyRound, RefreshCw, Settings2, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'

const COUNTRY_OPTIONS = ['RU', 'US', 'GB', 'DE', 'KZ', 'BY', 'UA', 'AE', 'UZ']

function SettingsPage() {
  const { data: user } = useCurrentUser()
  const permissions = useAuthStore((state) => state.permissions)
  const canManageSettings = permissions.includes('settings.manage')
  const { data: orgUnits = [] } = useOrgTree()
  const { data: notificationStats } = useNotificationStats()
  const syncUsersMutation = useSyncUsersFromJira()
  const markAllReadMutation = useMarkAllRead()

  const [newPassword, setNewPassword] = useState('')
  const [notifyByEmail, setNotifyByEmail] = useState(true)
  const [notifyOnApprovals, setNotifyOnApprovals] = useState(true)

  const countryQuery = useQuery({
    queryKey: ['settings', 'country'],
    queryFn: async () => {
      const response = await getCountryApiV1CalendarCountryGet({ throwOnError: true })
      return response.data.country_code
    },
    enabled: canManageSettings,
  })

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
    },
    onError: () => {
      toast.error('Failed to update country')
    },
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
    onError: () => {
      toast.error('Failed to update password')
    },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage profile, integrations, and workspace preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
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
                  <Input value={user?.username ?? ''} readOnly />
                </FormField>
                <FormField label="Email">
                  <Input value={user?.email ?? ''} readOnly />
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
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <Button onClick={handlePasswordUpdate} disabled={changePasswordMutation.isPending}>
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
                  <p className="text-sm text-muted-foreground">Send important updates to your email.</p>
                </div>
                <Switch checked={notifyByEmail} onCheckedChange={setNotifyByEmail} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Approval reminders</p>
                  <p className="text-sm text-muted-foreground">Notify when approvals are pending.</p>
                </div>
                <Switch checked={notifyOnApprovals} onCheckedChange={setNotifyOnApprovals} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  Unread notifications: <span className="font-semibold text-foreground">{notificationStats?.unread_count ?? 0}</span>
                </p>
                <Button
                  variant="outline"
                  onClick={handleMarkAllRead}
                  disabled={(notificationStats?.unread_count ?? 0) === 0 || markAllReadMutation.isPending}
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
                <div className="flex max-w-xs flex-col gap-2">
                  <Label>Instance country</Label>
                  <Select
                    value={countryQuery.data ?? ''}
                    onValueChange={(countryCode) => setCountryMutation.mutate(countryCode)}
                    disabled={countryQuery.isLoading || setCountryMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((countryCode) => (
                        <SelectItem key={countryCode} value={countryCode}>
                          {countryCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">Org units configured: {orgUnits.length}</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canManageSettings && (
          <TabsContent value="jira" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Jira Integration</CardTitle>
                <CardDescription>Manage user sync from Jira and integration health.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleSyncUsers} disabled={syncUsersMutation.isPending}>
                  <RefreshCw className={`mr-2 size-4 ${syncUsersMutation.isPending ? 'animate-spin' : ''}`} />
                  Sync users from Jira
                </Button>
                <p className="text-sm text-muted-foreground">
                  This action refreshes Jira users and updates employee mappings.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {!canManageSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="size-4" />
              Admin settings
            </CardTitle>
            <CardDescription>Org and Jira tabs are available to admins only.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}

export const settingsRoute = createRoute({
  path: 'settings',
  getParentRoute: () => appLayoutRoute,
  component: SettingsPage,
})
