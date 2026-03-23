import * as React from 'react';
import { useSyncProjects, useProjectSyncStatus } from '@/features/projects/hooks';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

export function SyncAllButton() {
  const { t } = useTranslation();
  const [syncJobId, setSyncJobId] = React.useState<string | null>(null);
  
  const syncMutation = useSyncProjects();
  const { data: jobStatus } = useProjectSyncStatus(syncJobId);

  const handleSyncAll = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (data: { job_id: string }) => {
        setSyncJobId(data.job_id);
        toast.success(t('web.projects.full_sync_started'));
      },
      onError: () => toast.error(t('web.projects.full_sync_start_failed')),
    });
  };

  // task_sync_all_projects now does a direct single-pass sync and returns
  // {"status": "success", "synced": N, "projects": M} when complete.
  React.useEffect(() => {
    if (jobStatus?.status === 'complete') {
      const result = jobStatus.result as { synced?: number; projects?: number } | undefined;
      const synced = result?.synced ?? 0;
      const projects = result?.projects ?? '?';
      toast.success(t('web.projects.full_sync_queued', { count: projects, synced }));
      setSyncJobId(null);
    } else if (jobStatus?.status === 'failed') {
      toast.error(`${t('web.projects.full_sync_failed')}: ${jobStatus.error || t('web.projects.unknown_error')}`);
      setSyncJobId(null);
    }
  }, [jobStatus?.status, jobStatus?.error, t]);

  const isJobRunning = !!jobStatus && jobStatus.status !== 'complete' && jobStatus.status !== 'failed';
  const isSyncing = syncMutation.isPending || isJobRunning;

  return (
    <div className="flex items-center gap-2">
      {isJobRunning && (
         <Badge variant="outline" className="animate-pulse bg-primary/5 text-primary border-primary/20 gap-2 px-3 py-1 h-8">
           <Loader2 className="h-4 w-4 animate-spin" />
           {t('web.projects.syncing_all')}
         </Badge>
      )}
      <Button
        onClick={handleSyncAll}
        disabled={isSyncing}
        variant="default"
        size="sm"
        className="font-semibold shadow-sm"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? t('web.projects.syncing') : t('projects.sync_all_active')}
      </Button>
    </div>
  );
}
