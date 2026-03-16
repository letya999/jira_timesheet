/* eslint-disable react-refresh/only-export-components */
import { createRoute, redirect } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { usersKeys, useUpdateUser, useUsers } from '@/features/users/hooks'
import { getUsersApiV1UsersGet } from '@/api/generated/sdk.gen'
import type { UserResponse } from '@/api/generated/types.gen'
import { useAuthStore } from '@/stores/auth-store'
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/shared/form-field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

const ROLE_OPTIONS = ['admin', 'manager', 'hr', 'employee']

function HrPage() {
  const { t } = useTranslation()
  const { data: response, isLoading } = useUsers({ page: 1, size: 200 })
  const updateUserMutation = useUpdateUser()

  const users = useMemo(
    () => (Array.isArray(response) ? response : response?.items ?? []),
    [response],
  )
  const [selectedUserId, setSelectedUserId] = useState<number | null>(users[0]?.id ?? null)
  const [draftRole, setDraftRole] = useState<string>('employee')
  const [draftActive, setDraftActive] = useState<boolean>(true)

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId],
  )

  const onSelectUser = (user: UserResponse) => {
    setSelectedUserId(user.id)
    setDraftRole(user.role ?? 'employee')
    setDraftActive(user.is_active ?? true)
  }

  const columns = useMemo<ColumnDef<UserResponse>[]>(
    () => [
      {
        accessorKey: 'email',
        header: t('common.email'),
      },
      {
        accessorKey: 'full_name',
        header: t('web.settings.full_name'),
        cell: ({ getValue }) => getValue<string | null>() ?? t('common.na'),
      },
      {
        accessorKey: 'role',
        header: t('common.role'),
        cell: ({ getValue }) => {
          const role = (getValue<string>() ?? 'employee').toUpperCase()
          return <Badge variant="secondary">{role}</Badge>
        },
      },
      {
        accessorKey: 'is_active',
        header: t('common.status'),
        cell: ({ getValue }) => (getValue<boolean>() ? t('common.active') : t('common.inactive')),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectUser(row.original)}
          >
            {t('org.manage_structure')}
          </Button>
        ),
      },
    ],
    [t],
  )

  const handleSave = () => {
    if (!selectedUser) return

    updateUserMutation.mutate(
      {
        id: selectedUser.id,
        data: {
          role: draftRole,
          is_active: draftActive,
        },
      },
      {
        onSuccess: () => toast.success(t('web.hr.user_updated')),
        onError: () => toast.error(t('web.hr.update_failed')),
      },
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('web.hr.title')}</h1>
        <p className="text-muted-foreground">{t('web.hr.subtitle')}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.tab_users')}</CardTitle>
            <CardDescription>{t('web.hr.users_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={users}
              filterColumn="email"
              filterPlaceholder={t('web.hr.filter_by_email')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('web.hr.management_form')}</CardTitle>
            <CardDescription>{t('web.hr.management_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label={t('common.user')}>
              <Input value={selectedUser?.email ?? t('web.hr.select_user_from_table')} readOnly />
            </FormField>
            <FormField label={t('common.role')}>
              <Select
                value={draftRole}
                onValueChange={setDraftRole}
                disabled={!selectedUser}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('web.hr.select_role')} />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">{t('web.hr.active_account')}</span>
              <Switch
                checked={draftActive}
                onCheckedChange={setDraftActive}
                disabled={!selectedUser}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!selectedUser || updateUserMutation.isPending}
            >
              {t('employees.save_changes')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const hrRoute = createRoute({
  path: 'hr',
  getParentRoute: () => appLayoutRoute,
  beforeLoad: () => {
    const { permissions } = useAuthStore.getState()
    if (!permissions.includes('hr:read')) {
      throw redirect({ to: '/app/dashboard' })
    }
  },
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: usersKeys.list(),
      queryFn: () => getUsersApiV1UsersGet().then((r) => r.data),
    }).catch(() => null),
  component: HrPage,
})
