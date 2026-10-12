import { createElement, lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { RequireAuth } from '@/auth';
import { FullPageLoader } from '@/components/common/LoadingSkeletons';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicOnlyRoute } from '@/components/layout/PublicOnlyRoute';
import { RootRoute, RouterErrorPage } from '@/components/layout/RootRoute';
import { RouteView } from '@/components/layout/RouteView';
import { AdminIndexRedirect } from '@/features/shell/components/AdminIndexRedirect';
import { paths } from '@/lib/routes';

import {
  APP_ROUTES,
  NOT_FOUND_ROUTE,
  PUBLIC_ROUTES,
  SHELL_ROUTE_PATTERNS,
  type AppRouteDefinition,
} from './routes';

/**
 * React Router (data router) tree, built from the route table in ./routes.ts:
 *
 *   RootRoute (ScrollRestoration, errorElement)
 *   ├─ PublicOnlyRoute → /login, /forgot-password
 *   └─ RequireAuth + AppLayout
 *      ├─ every app route (RouteView: guard → error boundary → Suspense(skeleton) → lazy page)
 *      ├─ /admin (AdminLayout) → index redirect + 10 sections
 *      ├─ /officer → redirect to the officer workspace
 *      └─ * → Not found
 */

const lazyCache = new Map<AppRouteDefinition['load'], LazyExoticComponent<ComponentType>>();

/** One React.lazy wrapper per page module loader (editor pages share a module across routes). */
function lazyPage(route: AppRouteDefinition): LazyExoticComponent<ComponentType> {
  const loader = route.load;
  if (!loader) throw new Error(`Route ${route.id} has no page module`);
  const cached = lazyCache.get(loader);
  if (cached) return cached;
  const component = lazy(loader);
  lazyCache.set(loader, component);
  return component;
}

function routeElement(route: AppRouteDefinition, fullPage = false) {
  return (
    <RouteView route={route} fallback={fullPage ? <FullPageLoader /> : undefined}>
      {createElement(lazyPage(route))}
    </RouteView>
  );
}

const adminLayoutRoute = APP_ROUTES.find((route) => route.id === 'admin');
const adminSectionRoutes = APP_ROUTES.filter((route) => route.admin);
const topLevelAppRoutes = APP_ROUTES.filter((route) => !route.admin && route.id !== 'admin');

function buildRoutes(): RouteObject[] {
  const appChildren: RouteObject[] = topLevelAppRoutes.map((route) => ({
    path: route.path,
    element: routeElement(route),
  }));

  if (adminLayoutRoute) {
    appChildren.push({
      path: adminLayoutRoute.path,
      element: routeElement(adminLayoutRoute),
      children: [
        { index: true, element: <AdminIndexRedirect /> },
        ...adminSectionRoutes.map((route) => ({
          path: route.path,
          element: routeElement(route),
        })),
      ],
    });
  }

  appChildren.push(
    {
      path: SHELL_ROUTE_PATTERNS.officerAlias,
      element: <Navigate to={paths.officerWorkspace()} replace />,
    },
    { path: NOT_FOUND_ROUTE.path, element: routeElement(NOT_FOUND_ROUTE) },
  );

  return [
    {
      element: <RootRoute />,
      errorElement: <RouterErrorPage />,
      children: [
        {
          element: <PublicOnlyRoute />,
          children: PUBLIC_ROUTES.map((route) => ({
            path: route.path,
            element: routeElement(route, true),
          })),
        },
        {
          element: (
            <RequireAuth loadingFallback={<FullPageLoader />}>
              <AppLayout />
            </RequireAuth>
          ),
          children: appChildren,
        },
      ],
    },
  ];
}

/** Route objects (exported for tests with `createMemoryRouter`). */
export const appRoutes: RouteObject[] = buildRoutes();

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
