import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import './styles/index.css';
import './i18n';
import { createQueryClient } from './lib/query-client';

// Import the generated route tree
// import { routeTree } from './routeTree.gen';

// For now, create a simple placeholder router
import { createRootRoute, createRoute } from '@tanstack/react-router';

const ReactQueryDevtools =
  import.meta.env.DEV
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((m) => ({
          default: m.ReactQueryDevtools,
        }))
      )
    : null;

const rootRoute = createRootRoute({
  component: () => (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-primary">Jira Timesheet - Phase 0</h1>
      <hr className="my-4" />
      <p>Hello World from React 19 + Vite 6 + Bun!</p>
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
});

const routeTree = rootRoute.addChildren([indexRoute]);
const router = createRouter({ routeTree });
const queryClient = createQueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {ReactQueryDevtools && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </React.Suspense>
      )}
    </QueryClientProvider>
  </React.StrictMode>
);
