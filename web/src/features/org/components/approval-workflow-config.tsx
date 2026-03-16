import * as React from 'react';
import { useApprovalRoutes, useCreateApprovalRoute, useDeleteApprovalRoute, useRoles } from '@/features/org/hooks';
import { OrgUnitResponse } from '@/features/org/schemas';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Loader2, ArrowDown } from 'lucide-react';
import { toast } from '@/lib/toast';

interface ApprovalWorkflowConfigProps {
  units: OrgUnitResponse[];
}

export function ApprovalWorkflowConfig({ units }: ApprovalWorkflowConfigProps) {
  const [selectedUnitId, setSelectedUnitId] = React.useState<number | null>(null);
  const [targetType, setTargetType] = React.useState<'leave' | 'timesheet'>('leave');
  
  const [stepOrder, setStepOrder] = React.useState(1);
  const [roleId, setRoleId] = React.useState<number | null>(null);

  const { data: routes = [], isLoading: routesLoading } = useApprovalRoutes(selectedUnitId || 0, targetType);
  const { data: roles = [] } = useRoles();

  const createMutation = useCreateApprovalRoute();
  const deleteMutation = useDeleteApprovalRoute();

  const handleCreate = () => {
    if (!selectedUnitId || !roleId) return;
    createMutation.mutate(
      { unit_id: selectedUnitId, target_type: targetType, step_order: stepOrder, role_id: roleId },
      {
        onSuccess: () => {
          setStepOrder((prev) => prev + 1);
          setRoleId(null);
          toast.success('Approval step added');
        },
        onError: () => toast.error('Failed to add approval step'),
      }
    );
  };

  const handleDelete = (routeId: number) => {
    if (!selectedUnitId) return;
    deleteMutation.mutate(
      { routeId, unitId: selectedUnitId, targetType },
      {
        onSuccess: () => toast.success('Step removed'),
        onError: () => toast.error('Failed to remove step'),
      }
    );
  };

  const sortedRoutes = [...routes].sort((a, b) => a.step_order - b.step_order);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium">Approval Workflows</h3>
        <p className="text-sm text-muted-foreground">Configure multi-step approval chains for requests.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="workflow-unit">Select Organizational Unit</Label>
          <Select
            value={selectedUnitId?.toString() || ''}
            onValueChange={(val) => setSelectedUnitId(Number(val))}
          >
            <SelectTrigger id="workflow-unit">
              <SelectValue placeholder="Select a unit..." />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id.toString()}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Request Type</Label>
          <RadioGroup
            value={targetType}
            onValueChange={(val: any) => setTargetType(val)}
            className="flex gap-4 pt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="leave" id="type-leave" />
              <Label htmlFor="type-leave">Leave Request</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="timesheet" id="type-timesheet" />
              <Label htmlFor="type-timesheet">Timesheet</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {selectedUnitId && (
        <div className="space-y-6">
           <div className="border rounded-md p-4 bg-muted/30">
             <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
               {targetType === 'leave' ? 'Leave' : 'Timesheet'} Approval Chain: {units.find(u => u.id === selectedUnitId)?.name}
             </h4>

             {routesLoading ? (
               <div className="flex items-center gap-2 py-4">
                 <Loader2 className="h-4 w-4 animate-spin" />
                 <span className="text-sm">Loading workflow...</span>
               </div>
             ) : (
               <div className="space-y-4">
                 {sortedRoutes.length === 0 ? (
                   <p className="text-sm text-muted-foreground italic">No approval steps defined. Requests will be auto-approved if no workflow exists.</p>
                 ) : (
                   <div className="flex flex-col items-center max-w-md mx-auto">
                     {sortedRoutes.map((route, index) => {
                       const role = roles.find(r => r.id === route.role_id);
                       return (
                         <React.Fragment key={route.id}>
                           <div className="w-full flex items-center justify-between p-3 border rounded-lg bg-background shadow-sm group">
                             <div className="flex items-center gap-3">
                               <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                 {route.step_order}
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-sm font-medium">{role?.name || `Role ID: ${route.role_id}`}</span>
                                 <span className="text-[10px] text-muted-foreground uppercase">Step {route.step_order}</span>
                               </div>
                             </div>
                             <Button
                               variant="ghost"
                               size="icon-sm"
                               className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                               onClick={() => handleDelete(route.id)}
                               disabled={deleteMutation.isPending}
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </div>
                           {index < sortedRoutes.length - 1 && (
                             <ArrowDown className="h-4 w-4 text-muted-foreground my-1" />
                           )}
                         </React.Fragment>
                       );
                     })}
                   </div>
                 )}
               </div>
             )}
           </div>

           <div className="border rounded-md p-4 space-y-4">
              <h4 className="text-sm font-medium">Add Approval Step</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="step-order" className="text-xs">Step Order</Label>
                    <Input
                      id="step-order"
                      type="number"
                      min={1}
                      value={stepOrder}
                      onChange={(e) => setStepOrder(Number(e.target.value))}
                    />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="workflow-role" className="text-xs">Required Role</Label>
                    <Select
                      value={roleId?.toString() || ''}
                      onValueChange={(val) => setRoleId(Number(val))}
                    >
                      <SelectTrigger id="workflow-role">
                        <SelectValue placeholder="Select role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r: any) => (
                          <SelectItem key={r.id} value={r.id.toString()}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!roleId || createMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
           </div>
        </div>
      )}
    </div>
  );
}
