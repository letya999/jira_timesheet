import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import './styles/index.css';
import './i18n';
import { createQueryClient } from './lib/query-client';
import { router } from './router';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/shared/theme-provider';

const ReactQueryDevtools =
  import.meta.env.DEV
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((m) => ({
          default: m.ReactQueryDevtools,
        }))
      )
    : null;

const queryClient = createQueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="jira-timesheet-theme">
        <TooltipProvider>
          <RouterProvider router={router} />
          {ReactQueryDevtools && (
            <React.Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </React.Suspense>
          )}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
