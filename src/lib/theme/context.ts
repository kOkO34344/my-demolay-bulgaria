import { createContext } from 'react';

import type { ResolvedTheme, ThemePreference } from './theme';

export interface ThemeContextValue {
  /** What the user chose. */
  preference: ThemePreference;
  /** What is actually shown. */
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Switches to the opposite of the resolved theme (explicit preference). */
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
