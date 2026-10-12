import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { AuthProvider } from '@/auth/AuthProvider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { i18n } from '@/i18n';
import { ThemeProvider, type ThemePreference } from '@/lib/theme';

import { queryClient as defaultQueryClient } from './queryClient';

interface AppProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  /** Tests/previews: force a theme instead of the stored preference. */
  initialTheme?: ThemePreference;
  /** Tests: override demo mode. */
  demoMode?: boolean;
  /** Render the global toast host (default true). */
  withToaster?: boolean;
}

/**
 * Global providers (order matters): data cache → i18n → theme → auth → tooltips/toasts.
 * The router is NOT included — the shell renders <RouterProvider> inside these providers.
 */
export function AppProviders({
  children,
  queryClient = defaultQueryClient,
  initialTheme,
  demoMode,
  withToaster = true,
}: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider initialPreference={initialTheme}>
          <AuthProvider demoMode={demoMode}>
            <TooltipProvider>
              {children}
              {withToaster ? (
                <Toaster position="bottom-right" mobileOffset={{ bottom: 88 }} />
              ) : null}
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
