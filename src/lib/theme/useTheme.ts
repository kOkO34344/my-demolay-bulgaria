import { useContext } from 'react';

import { ThemeContext, type ThemeContextValue } from './context';

/** Theme preference + resolved theme. Must be used inside <ThemeProvider> (src/app/providers.tsx). */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within <ThemeProvider>');
  return context;
}
