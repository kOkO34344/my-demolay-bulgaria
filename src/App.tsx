import { RouterProvider } from 'react-router';

import { PwaUpdatePrompt } from '@/features/shell/pwa/PwaUpdatePrompt';
import { startInstallPromptCapture } from '@/features/shell/pwa/installPrompt';

import { createAppRouter } from './app/router';

// Capture `beforeinstallprompt` before any settings page mounts (usePwaInstall reads it later).
startInstallPromptCapture();

const router = createAppRouter();

/**
 * Application root (rendered inside <AppProviders> by main.tsx): the data router built from the
 * route table in src/app/routes.ts, plus service-worker registration / update prompts.
 */
export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
    </>
  );
}
