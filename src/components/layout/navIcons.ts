import {
  BellIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  EllipsisIcon,
  FileTextIcon,
  FolderOpenIcon,
  HouseIcon,
  LandmarkIcon,
  NewspaperIcon,
  Settings2Icon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';

import type { NavSection } from '@/app/routes';

/** One icon per navigation item / section (the core nav model leaves icons to the shell). */
export const NAV_ICONS: Record<NavSection, LucideIcon> = {
  home: HouseIcon,
  news: NewspaperIcon,
  events: CalendarDaysIcon,
  chapter: LandmarkIcon,
  resources: FolderOpenIcon,
  notifications: BellIcon,
  profile: UserRoundIcon,
  more: EllipsisIcon,
  officerWorkspace: ClipboardListIcon,
  content: FileTextIcon,
  members: UsersIcon,
  admin: Settings2Icon,
};

export function navIconFor(id: string): LucideIcon {
  return (NAV_ICONS as Record<string, LucideIcon | undefined>)[id] ?? EllipsisIcon;
}
