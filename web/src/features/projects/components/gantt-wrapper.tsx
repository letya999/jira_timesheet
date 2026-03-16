import * as React from 'react';
import { GanttChartWrapper, GanttTask } from '@/components/gantt/gantt-chart-wrapper';
import { useProjectSprints } from '@/features/projects/hooks';
import { Skeleton } from '@/components/ui/skeleton';

interface GanttWrapperProps {
  projectId: number;
}

export function GanttWrapper({ projectId }: GanttWrapperProps) {
  const { data: sprints = [], isLoading } = useProjectSprints(projectId);

  const tasks = React.useMemo(() => {
    const data: GanttTask[] = sprints
      .filter(s => s.start_date && s.end_date)
      .map(s => {
        const start = new Date(s.start_date!);
        const end = new Date(s.end_date!);
        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: s.id,
          text: s.name,
          start_date: s.start_date!,
          duration: duration > 0 ? duration : 1,
          progress: s.state === 'closed' ? 1 : s.state === 'active' ? 0.5 : 0,
          color: s.state === 'active' ? '#3b82f6' : s.state === 'closed' ? '#10b981' : '#94a3b8',
        };
      });

    return { data };
  }, [sprints]);

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;
  if (tasks.data.length === 0) return (
    <div className="h-[200px] flex items-center justify-center border rounded-lg bg-muted/20 italic text-muted-foreground">
      No sprints with dates found for this project.
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold px-1">Sprint Roadmap</h3>
      <GanttChartWrapper 
        tasks={tasks} 
        className="h-[400px]"
        config={{
            readonly: true,
            columns: [
                { name: "text", label: "Sprint Name", tree: true, width: 200 },
                { name: "start_date", label: "Start", width: 100, align: "center" },
                { name: "duration", label: "Days", width: 60, align: "center" }
            ]
        }}
      />
    </div>
  );
}
