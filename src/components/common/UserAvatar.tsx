import { useTranslation } from 'react-i18next';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { LocalizedText } from '@/domain';
import { useLocalized } from '@/i18n/public';
import { cn } from '@/lib/utils';

/** DI palette fills (docs/DESIGN-SYSTEM.md §3), each paired with a text colour that passes 4.5:1. */
const AVATAR_TONES = [
  'bg-brand-oxford text-white', // 9.4:1
  'bg-brand-oxford-shade text-white', // 12.1:1
  'bg-brand-ruby text-white', // 6.9:1
  'bg-brand-emerald-shade text-white', // 6.7:1
  'bg-brand-sapphire-shade text-white', // 7.6:1
  'bg-brand-gold text-brand-ink', // 8.2:1
  'bg-brand-beacon-shade text-white', // 5.3:1
] as const;

const SIZES = {
  xs: 'size-6 text-[0.625rem]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-20 text-2xl',
} as const;

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** "Мартин Георгиев" → "МГ"; "Martin" → "M". */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toLocaleUpperCase();
}

export interface UserAvatarProps {
  /** Display name (LocalizedText from the domain, or an already-localized string). */
  name: LocalizedText | string;
  /** Stable seed for the colour (user id). Defaults to the English name. */
  seed?: string;
  /** Optional uploaded photo. Demo data never ships photos of real people. */
  src?: string | null;
  size?: keyof typeof SIZES;
  /**
   * Decorative (default) when the name is shown next to the avatar — hidden from screen readers.
   * Set false for a standalone avatar: it becomes an image labelled "Profile photo of <name>".
   */
  decorative?: boolean;
  className?: string;
}

/** Initials avatar with a deterministic brand-palette colour (same person → same colour everywhere). */
export function UserAvatar({
  name,
  seed,
  src,
  size = 'sm',
  decorative = true,
  className,
}: UserAvatarProps) {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const displayName = typeof name === 'string' ? name : text(name);
  const colourSeed = seed ?? (typeof name === 'string' ? name : name.en);
  const tone = AVATAR_TONES[hash(colourSeed) % AVATAR_TONES.length];

  return (
    <Avatar
      className={cn(SIZES[size], 'ring-1 ring-border', className)}
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': t('common.a11y.avatarOf', { name: displayName }) })}
    >
      {src ? <AvatarImage src={src} alt="" className="object-cover" /> : null}
      <AvatarFallback className={cn('font-semibold tracking-wide', tone)}>
        {initialsOf(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}
