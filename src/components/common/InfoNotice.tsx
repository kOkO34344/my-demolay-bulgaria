import {
  CircleCheckIcon,
  FlaskConicalIcon,
  InfoIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const TONES = {
  info: {
    icon: InfoIcon,
    className: 'border-info/30 bg-info-soft text-info-soft-foreground',
  },
  success: {
    icon: CircleCheckIcon,
    className: 'border-success/30 bg-success-soft text-success-soft-foreground',
  },
  warning: {
    icon: TriangleAlertIcon,
    className: 'border-warning/30 bg-warning-soft text-warning-soft-foreground',
  },
  neutral: {
    icon: InfoIcon,
    className: 'border-border bg-muted/70 text-foreground',
  },
  /** Prototype / simulation notices ("Simulated — no live system is connected"). */
  demo: {
    icon: FlaskConicalIcon,
    className: 'border-dashed border-input/70 bg-card text-foreground',
  },
} as const satisfies Record<string, { icon: LucideIcon; className: string }>;

export interface InfoNoticeProps {
  tone?: keyof typeof TONES;
  title?: ReactNode;
  children?: ReactNode;
  /** Replace the tone's icon (pass `null` for none). */
  icon?: LucideIcon | null;
  /** Inline action (link/button) aligned to the end on wide screens. */
  action?: ReactNode;
  /** 'status' for notices that appear in response to something (announced politely). */
  role?: 'status' | 'note';
  className?: string;
}

/**
 * Quiet inline notice for context the user should know but not act on immediately — e.g.
 * "Simulated — no live system is connected", "Imported positions are demo data", privacy notes.
 * Icon + text (never colour-only). For errors use ErrorState / Alert variant="destructive".
 */
export function InfoNotice({
  tone = 'info',
  title,
  children,
  icon,
  action,
  role = 'note',
  className,
}: InfoNoticeProps) {
  const config = TONES[tone];
  const Icon = icon === undefined ? config.icon : icon;
  return (
    <div
      role={role}
      data-slot="info-notice"
      className={cn(
        'flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-start',
        config.className,
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {Icon ? <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : null}
        <div className="flex min-w-0 flex-col gap-0.5">
          {title ? <p className="font-semibold">{title}</p> : null}
          {children ? (
            <div className={cn(title && 'opacity-95', tone === 'demo' && 'text-muted-foreground')}>
              {children}
            </div>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0 sm:ml-auto">{action}</div> : null}
    </div>
  );
}
