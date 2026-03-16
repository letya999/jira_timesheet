import * as React from 'react';
import { OrgUnitCreate } from '@/features/org/schemas';
import { useOrgTree, useCreateOrgUnit, useUpdateOrgUnit, useDeleteOrgUnit } from '@/features/org/hooks';
import { useCurrentUser } from '@/features/auth/hooks';
import { OrgTreeNode } from '../components/org-tree-node';
import { UnitForm } from '../components/unit-form';
import { RoleManager } from '../components/role-manager';
import { UnitRoleAssignments } from '../components/unit-role-assignments';
import { ApprovalWorkflowConfig } from '../components/approval-workflow-config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Edit, Network, Settings2, ShieldCheck } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export function OrgPage() {
  const { t } = useTranslation();
  const { data: currentUser, isLoading: authLoading } = useCurrentUser();
  const { data: units = [], isLoading: orgLoading } = useOrgTree();
  
  const [editingUnitId, setEditingUnitId] = React.useState<number | null>(null);

  const createMutation = useCreateOrgUnit();
  const updateMutation = useUpdateOrgUnit();
  const deleteMutation = useDeleteOrgUnit();

  if (authLoading) return <div className="p-6">{t('web.org.loading_permissions')}</div>;
  if (currentUser?.role !== 'Admin') return <Navigate to="/" />;

  const rootUnits = (units as any[]).filter((u) => !u.parent_id);
  const editingUnit = (units as any[]).find((u) => u.id === editingUnitId);

  const handleCreate = (data: OrgUnitCreate) => {
    createMutation.mutate(data, {
      onSuccess: () => toast.success(t('web.org.unit_created')),
      onError: () => toast.error(t('web.org.unit_create_failed')),
    });
  };

  const handleUpdate = (data: Partial<OrgUnitCreate>) => {
    if (!editingUnitId) return;
    updateMutation.mutate(
      { id: editingUnitId, data },
      {
        onSuccess: () => {
          setEditingUnitId(null);
          toast.success(t('web.org.unit_updated'));
        },
        onError: () => toast.error(t('web.org.unit_update_failed')),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm(t('web.org.confirm_delete_unit'))) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          if (editingUnitId === id) setEditingUnitId(null);
          toast.success(t('web.org.unit_deleted'));
        },
        onError: () => toast.error(t('web.org.unit_delete_failed')),
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('org.management_title')}</h1>
        <p className="text-muted-foreground">{t('web.org.page_subtitle')}</p>
      </div>

      <Tabs defaultValue="hierarchy" className="w-full">
        <TabsList>
          <TabsTrigger value="hierarchy" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            {t('org.company_hierarchy_tab')}
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            {t('org.manage_structure_roles_tab')}
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t('org.approval_workflows_tab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchy" className="pt-4">
          <div className="max-w-3xl border rounded-md p-6 bg-card">
            {orgLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {rootUnits.map((unit) => (
                  <OrgTreeNode key={unit.id} unit={unit as any} allUnits={units as any} />
                ))}
                {rootUnits.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground italic">{t('org.no_units')}</p>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="manage" className="space-y-12 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <UnitForm
                units={units as any}
                onSubmit={handleCreate}
                isPending={createMutation.isPending}
              />

              <div className="space-y-4 border p-4 rounded-md bg-muted/30">
                <h3 className="text-lg font-medium">{t('org.edit_delete_unit')}</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-unit-select">{t('org.select_unit')}</Label>
                  <Select
                    value={editingUnitId?.toString() || ''}
                    onValueChange={(val) => setEditingUnitId(Number(val))}
                  >
                    <SelectTrigger id="edit-unit-select">
                      <SelectValue placeholder={t('web.org.select_unit_to_modify')} />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editingUnit && (
                  <div className="pt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingUnitId(editingUnit.id)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {t('web.org.edit_details')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(editingUnit.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {editingUnitId && editingUnit && (
                  <div className="mt-4 pt-4 border-t">
                    <UnitForm
                      initialData={editingUnit as any}
                      units={units as any}
                      onSubmit={handleUpdate}
                      isPending={updateMutation.isPending}
                      onCancel={() => setEditingUnitId(null)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <RoleManager />
              <div className="border-t pt-8">
                <UnitRoleAssignments units={units as any} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="pt-4">
          <div className="max-w-4xl">
            <ApprovalWorkflowConfig units={units as any} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
