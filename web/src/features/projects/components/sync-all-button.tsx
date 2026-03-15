import * as React from 'react';
import { useSyncProjects, useProjectSyncStatus } from '@/features/projects/hooks';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';

export function SyncAllButton() {
  const [syncJobId, setSyncJobId] = React.useState<string | null>(null);
  
  const syncMutation = useSyncProjects();
  const { data: jobStatus } = useProjectSyncStatus(syncJobId);

  const handleSyncAll = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (data: { job_id: string }) => {
        setSyncJobId(data.job_id);
        toast.success('Full sync job started');
      },
      onError: () => toast.error('Failed to start full sync'),
    });
  };

  // Toast on completion
  React.useEffect(() => {
    if (jobStatus?.status === 'complete') {
      toast.success('Full sync completed successfully');
      setSyncJobId(null);
    } else if (jobStatus?.status === 'failed') {
      toast.error(`Full sync failed: ${jobStatus.error || 'Unknown error'}`);
      setSyncJobId(null);
    }
  }, [jobStatus?.status]);

  const isSyncing = syncMutation.isPending || (jobStatus && jobStatus.status !== 'complete' && jobStatus.status !== 'failed');

  return (
    <div className="flex items-center gap-2">
      {isSyncing && (
         <Badge variant="outline" className="animate-pulse bg-primary/5 text-primary border-primary/20 gap-2 px-3 py-1 h-8">
           <Loader2 className="h-4 w-4 animate-spin" />
           Syncing All Projects... {jobStatus?.progress ? `${Math.round(jobStatus.progress * 100)}%` : ''}
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
        {isSyncing ? 'Syncing...' : 'Sync All Active Projects'}
      </Button>
    </div>
  );
}
