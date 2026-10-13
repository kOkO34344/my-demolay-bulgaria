/**
 * Authorization & session API for UI code: `import { useAuth, usePolicy, Can, … } from '@/auth'`.
 * The UI must never branch on role names — use permissions and the policy helpers.
 */
export { AuthProvider } from './AuthProvider';
export { Can } from './Can';
export { RequireAuth, RequirePermission } from './RequirePermission';
export { useAuth, useSubject, useCan, usePolicy } from './hooks';
export type { AuthContextValue, AuthStatus } from './context';
export { bindPolicy, type BoundPolicy } from './boundPolicy';
export * from './policy';
export {
  PERMISSIONS,
  PERMISSION_CATALOGUE,
  PERMISSION_GROUPS,
  permissionsByGroup,
  isPermission,
  type PermissionGroup,
  type PermissionMeta,
} from './permissions';
export {
  ROLES,
  ROLE_DEFINITIONS,
  listRoleDefinitions,
  roleRank,
  maxRoleRank,
  sortRolesByRank,
  isRole,
} from './roles';
export {
  scopeRank,
  chapterScope,
  normalizeScope,
  resolveGrantScope,
  scopesEqual,
  NATIONAL_SCOPE,
  SYSTEM_SCOPE,
  SELF_SCOPE,
} from './scope';
export {
  ROUTE_ACCESS,
  NAV_ITEMS,
  ADMIN_TABS,
  canAccessRoute,
  visibleNavItems,
  visibleAdminTabs,
  type NavItem,
  type NavGroup,
  type NavPlacement,
  type AdminTab,
  type RouteAccessRule,
} from './routeAccess';
export {
  isDemoModeEnabled,
  buildSubject,
  primaryRole,
  broadestScopeLevel,
  chapterRoleChapterIds,
  subjectTitleKey,
} from './subject';
export {
  DEMO_PERSONAS,
  DEMO_PERSONA_DEFINITIONS,
  demoOverrideFor,
  isDemoPersona,
  personaDescriptionKey,
  personaLabelKey,
  personaRoles,
  type DemoPersona,
  type DemoPersonaId,
} from './demoPersonas';
export { MEMBER_TYPES, MEMBER_TYPE_GRANTS, isMemberType, requiresDemId } from './memberTypes';
export {
  DEMO_CREDENTIALS,
  getDemoCredentials,
  demoCredentialForPersona,
  personaOfUser,
  type DemoCredential,
} from './demoCredentials';
export * from './schemas';
