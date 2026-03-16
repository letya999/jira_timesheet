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

const ROLE_OPTIONS = ['admin', 'manager', 'hr', 'employee']

function HrPage() {
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
        header: 'Email',
      },
      {
        accessorKey: 'full_name',
        header: 'Full name',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ getValue }) => {
          const role = (getValue<string>() ?? 'employee').toUpperCase()
          return <Badge variant="secondary">{role}</Badge>
        },
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ getValue }) => (getValue<boolean>() ? 'Active' : 'Inactive'),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectUser(row.original)}
          >
            Manage
          </Button>
        ),
      },
    ],
    [],
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
        onSuccess: () => toast.success('User updated'),
        onError: () => toast.error('Failed to update user'),
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
        <h1 className="text-2xl font-bold">HR Administration</h1>
        <p className="text-muted-foreground">Manage user access and account status for HR workflows.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Directory with role and active state.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={users}
              filterColumn="email"
              filterPlaceholder="Filter by email..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Management Form</CardTitle>
            <CardDescription>Update selected user permissions and status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="User">
              <Input value={selectedUser?.email ?? 'Select a user from the table'} readOnly />
            </FormField>
            <FormField label="Role">
              <Select
                value={draftRole}
                onValueChange={setDraftRole}
                disabled={!selectedUser}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
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
              <span className="text-sm font-medium">Active account</span>
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
              Save changes
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
