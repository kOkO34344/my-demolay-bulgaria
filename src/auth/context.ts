import { createContext } from 'react';

import type {
  CurrentMember,
  DemoPersonaId,
  DemoRoleOverride,
  LoginInput,
  Session,
  Subject,
  User,
} from '@/domain';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  member: CurrentMember | null;
  /** Effective policy subject (includes the demo override). null when signed out. */
  subject: Subject | null;
  /** The demo persona of the signed-in demo account (before any demo override); null otherwise. */
  actualPersona: DemoPersonaId | null;
  /** VITE_DEMO_MODE !== 'false' */
  isDemoMode: boolean;
  /** Active demo role override, if any. */
  demoOverride: DemoRoleOverride | null;
  login: (input: LoginInput) => Promise<Session>;
  logout: () => Promise<void>;
  /** Prototype only. Rejects with ForbiddenError('demo_mode_disabled') when demo mode is off. */
  switchDemoRole: (persona: DemoPersonaId | null) => Promise<Session>;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  isSwitchingRole: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
