import { createElement } from 'react';

import { navIconFor } from './navIcons';

/** Decorative icon for a navigation item / section id (see NAV_ICONS). */
export function NavIcon({ id, className }: { id: string; className?: string }) {
  return createElement(navIconFor(id), { 'aria-hidden': true, className });
}
