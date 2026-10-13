import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type HeadingLevel = 2 | 3 | 4;

interface SectionBaseProps {
  /** Translated section title (rendered as a heading; h2 by default). */
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned actions next to the title ("View all", "New event"…). */
  actions?: ReactNode;
  /** Heading level: 2 directly under the page h1, 3 inside another section. */
  headingLevel?: HeadingLevel;
  /** Visually hide the heading (still announced by screen readers). */
  hideTitle?: boolean;
  children?: ReactNode;
  className?: string;
  id?: string;
}

function SectionHeading({
  level,
  id,
  className,
  children,
}: {
  level: HeadingLevel;
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const Tag = `h${level}` as const;
  return (
    <Tag id={id} className={className}>
      {children}
    </Tag>
  );
}

/**
 * A titled region of a page (`<section aria-labelledby>`), no surface. Use for page areas that hold
 * their own cards/lists. Spacing: sections stack with `gap-8`.
 */
export function Section({
  title,
  description,
  actions,
  headingLevel = 2,
  hideTitle = false,
  children,
  className,
  id,
}: SectionBaseProps) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className={cn('flex flex-col gap-4', className)}>
      <div
        className={cn(
          'flex flex-wrap items-end justify-between gap-x-4 gap-y-2',
          hideTitle && !actions && 'sr-only',
        )}
      >
        <div className={cn('flex min-w-0 flex-col gap-1', hideTitle && 'sr-only')}>
          <SectionHeading
            level={headingLevel}
            id={headingId}
            className={headingLevel === 2 ? 'text-xl' : 'text-lg'}
          >
            {title}
          </SectionHeading>
          {description ? (
            <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

interface SectionCardProps extends SectionBaseProps {
  /** Footer row (e.g. "View all" link or form actions), separated by a hairline. */
  footer?: ReactNode;
  /** Remove body padding (for edge-to-edge lists/tables inside the card). */
  flush?: boolean;
  bodyClassName?: string;
}

/**
 * A titled card surface (white, hairline border, 8 px radius, no heavy shadow). Use for dashboard
 * widgets, settings groups and detail panels. Lists inside should use `flush` and their own dividers.
 */
export function SectionCard({
  title,
  description,
  actions,
  headingLevel = 2,
  hideTitle = false,
  footer,
  flush = false,
  children,
  className,
  bodyClassName,
  id,
}: SectionCardProps) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        'flex min-w-0 flex-col rounded-lg border bg-card text-card-foreground shadow-xs',
        className,
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:px-5 sm:pt-5',
          hideTitle && !actions && 'sr-only',
        )}
      >
        <div className={cn('flex min-w-0 flex-col gap-1', hideTitle && 'sr-only')}>
          <SectionHeading level={headingLevel} id={headingId} className="text-lg">
            {title}
          </SectionHeading>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div
        className={cn(
          'flex-1',
          flush ? 'mt-3 border-t' : 'px-4 pt-3 pb-4 sm:px-5 sm:pb-5',
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3 sm:px-5">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

/** Vertical rhythm for page content under the PageHeader (sections 32 px apart). */
export function PageStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-8', className)}>{children}</div>;
}
