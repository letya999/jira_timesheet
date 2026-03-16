import { useProject, useProjectSprints } from '@/features/projects/hooks';
import { GanttWrapper } from '../components/gantt-wrapper';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

interface ProjectDetailPageProps {
  projectId: number;
}

const sprintColumns: ColumnDef<any>[] = [
  {
    accessorKey: 'name',
    header: 'Sprint Name',
  },
  {
    accessorKey: 'state',
    header: 'Status',
    cell: ({ row }) => {
      const state = row.original.state;
      return (
        <Badge 
            variant={state === 'active' ? 'default' : state === 'closed' ? 'secondary' : 'outline'}
            className="capitalize"
        >
          {state}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'start_date',
    header: 'Start Date',
    cell: ({ row }) => row.original.start_date ? format(new Date(row.original.start_date), 'MMM dd, yyyy') : '-',
  },
  {
    accessorKey: 'end_date',
    header: 'End Date',
    cell: ({ row }) => row.original.end_date ? format(new Date(row.original.end_date), 'MMM dd, yyyy') : '-',
  },
];

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: sprints = [], isLoading: sprintsLoading } = useProjectSprints(projectId);

  if (projectLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">Project not found</h2>
        <Link to="/app/projects" className="text-primary hover:underline mt-4 block">Back to projects</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/app/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg py-1 px-3 font-mono">{project.key}</Badge>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <Badge variant={project.is_active ? 'default' : 'secondary'}>
            {project.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">Sprints</h2>
          {sprintsLoading ? (
             <Skeleton className="h-40 w-full" />
          ) : (
            <DataTable 
                columns={sprintColumns} 
                data={sprints} 
            />
          )}
        </section>

        <section>
          <GanttWrapper projectId={projectId} />
        </section>
      </div>
    </div>
  );
}
