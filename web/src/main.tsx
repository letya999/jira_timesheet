import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import './styles/index.css';
import './i18n';

// Import the generated route tree
// import { routeTree } from './routeTree.gen';

// For now, create a simple placeholder router
import { createRootRoute, createRoute } from '@tanstack/react-router';

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

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
