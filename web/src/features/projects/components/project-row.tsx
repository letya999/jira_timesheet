import * as React from 'react';
import { ProjectResponse } from '@/features/projects/schemas';
import { useUpdateProject, useSyncProjects, useProjectSyncStatus } from '@/features/projects/hooks';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

interface ProjectRowProps {
  project: ProjectResponse;
}

export function ProjectRow({ project }: ProjectRowProps) {
  const [syncJobId, setSyncJobId] = React.useState<string | null>(null);
  
  const updateMutation = useUpdateProject();
  const syncMutation = useSyncProjects();
  const { data: jobStatus } = useProjectSyncStatus(syncJobId);

  const handleToggleActive = (checked: boolean) => {
    updateMutation.mutate(
      { id: project.id, data: { is_active: checked } },
      {
        onSuccess: () => toast.success(`Project ${checked ? 'activated' : 'deactivated'}`),
        onError: () => toast.error('Failed to update project'),
      }
    );
  };

  const handleSync = () => {
    syncMutation.mutate(project.id, {
      onSuccess: (data: { job_id: string }) => {
        setSyncJobId(data.job_id);
        toast.success('Sync job started');
      },
      onError: () => toast.error('Failed to start sync'),
    });
  };

  // Reset job ID when complete or failed
  React.useEffect(() => {
    if (jobStatus?.status === 'complete' || jobStatus?.status === 'failed') {
      const timer = setTimeout(() => setSyncJobId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [jobStatus?.status]);

  const isSyncing = syncMutation.isPending || (jobStatus && jobStatus.status !== 'complete' && jobStatus.status !== 'failed');

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="font-mono">{project.key}</Badge>
        <div className="flex flex-col">
          <span className="font-medium">{project.name}</span>
          <span className="text-xs text-muted-foreground">ID: {project.id}</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Sync</span>
          <Switch
            checked={project.is_active}
            onCheckedChange={handleToggleActive}
            disabled={updateMutation.isPending}
          />
        </div>

        <div className="flex items-center gap-2 min-w-[120px] justify-end">
          {jobStatus?.status === 'complete' && (
            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Synced
            </Badge>
          )}
          {jobStatus?.status === 'failed' && (
            <Badge variant="outline" className="text-destructive bg-destructive/10 border-destructive/20 gap-1">
              <XCircle className="h-3 w-3" />
              Failed
            </Badge>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSync}
            disabled={isSyncing || !project.is_active}
            className={isSyncing ? 'bg-muted' : ''}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}
