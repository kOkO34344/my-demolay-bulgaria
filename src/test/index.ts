/**
 * Test utilities: `import { renderWithProviders, screen } from '@/test'`.
 */
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export {
  renderWithProviders,
  createTestQueryClient,
  type RenderWithProvidersOptions,
} from './render';
export { axeViolations, summarizeViolations } from './a11y';
export { mediaState } from './polyfills';
export {
  buildSubject,
  defaultScope,
  personaSubject,
  roleSubject,
  subjectsByPersona,
} from './subjects';
