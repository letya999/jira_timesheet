import * as React from 'react';
import { useProjects, useRefreshProjects } from '@/features/projects/hooks';
import { ProjectRow } from '../components/project-row';
import { SyncAllButton } from '../components/sync-all-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useTranslation } from 'react-i18next';
import type { ProjectResponse } from '@/features/projects/schemas';
import { CardList } from '@/components/shared/card-list';

type PaginatedProjects = {
  items: ProjectResponse[];
  total: number;
};

export function ProjectsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: projectsData, isLoading } = useProjects({
    page,
    size: pageSize,
    search: debouncedSearch,
  });

  const refreshMutation = useRefreshProjects();

  const handleRefresh = () => {
    refreshMutation.mutate(undefined, {
      onSuccess: () => toast.success(t('web.projects.refreshed')),
      onError: () => toast.error(t('web.projects.refresh_failed')),
    });
  };

  const projects = Array.isArray(projectsData)
    ? (projectsData as ProjectResponse[])
    : ((projectsData as PaginatedProjects | undefined)?.items ?? []);
  const total = Array.isArray(projectsData)
    ? projects.length
    : ((projectsData as PaginatedProjects | undefined)?.total ?? 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('projects.title')}</h1>
          <p className="text-muted-foreground">{t('projects.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshMutation.isPending} variant="outline" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            {t('projects.refresh_jira')}
          </Button>
          <SyncAllButton />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('projects.search_hint')}
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <CardList
          items={projects}
          renderItem={(project) => <ProjectRow key={project.id} project={project} />}
          isLoading={isLoading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          itemLabel="projects"
          emptyMessage={t('projects.no_projects_hint')}
          skeletonCount={5}
          skeletonHeight="h-[72px]"
        />
      </div>
    </div>
  )
}
