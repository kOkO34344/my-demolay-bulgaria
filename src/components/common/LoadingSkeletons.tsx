import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Loading placeholders that mirror the final layout (no layout shift). Every variant is wrapped in a
 * polite `role="status"` region with a translated, visually hidden "Loading…" label — the skeleton
 * blocks themselves are aria-hidden.
 */
function LoadingRegion({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label ?? t('common.states.loading')}</span>
      {children}
    </div>
  );
}

const range = (count: number) => Array.from({ length: Math.max(0, count) }, (_, index) => index);

export interface SkeletonProps {
  className?: string;
  /** Override the screen-reader label (default "Loading…"). */
  label?: string;
}

/** Rows of list items (feeds, notifications, resource lists). */
export function ListSkeleton({
  rows = 5,
  withAvatar = false,
  className,
  label,
}: SkeletonProps & { rows?: number; withAvatar?: boolean }) {
  return (
    <LoadingRegion label={label} className={cn('divide-y rounded-lg border bg-card', className)}>
      {range(rows).map((index) => (
        <div key={index} className="flex items-start gap-3 p-4">
          {withAvatar ? <Skeleton className="size-9 shrink-0 rounded-full" /> : null}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className={cn('h-4', index % 2 === 0 ? 'w-2/3' : 'w-1/2')} />
            <Skeleton className="h-3 w-full max-w-md" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

/** Grid of cards (events, resources, dashboard widgets). */
export function CardGridSkeleton({
  cards = 6,
  className,
  label,
}: SkeletonProps & { cards?: number }) {
  return (
    <LoadingRegion
      label={label}
      className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}
    >
      {range(cards).map((index) => (
        <div key={index} className="flex gap-4 rounded-lg border bg-card p-4">
          <Skeleton className="h-14 w-12 shrink-0 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-2 h-5 w-20 rounded" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

/** Dense admin table (header + rows). On small screens it renders as stacked cards like DataTable. */
export function TableSkeleton({
  rows = 8,
  columns = 5,
  className,
  label,
}: SkeletonProps & { rows?: number; columns?: number }) {
  return (
    <LoadingRegion label={label} className={cn('rounded-lg border bg-card', className)}>
      <div className="hidden md:block">
        <div className="flex gap-4 border-b bg-muted/60 px-3 py-2.5">
          {range(columns).map((col) => (
            <Skeleton key={col} className="h-3 flex-1" />
          ))}
        </div>
        {range(rows).map((row) => (
          <div key={row} className="flex gap-4 border-b px-3 py-3 last:border-b-0">
            {range(columns).map((col) => (
              <Skeleton
                key={col}
                className={cn('h-3.5 flex-1', col === 0 ? 'max-w-48' : 'max-w-32')}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="divide-y md:hidden">
        {range(Math.min(rows, 4)).map((row) => (
          <div key={row} className="flex flex-col gap-2 p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Detail page body (title block, meta row, paragraphs, side panel on lg). */
export function DetailSkeleton({ className, label }: SkeletonProps) {
  return (
    <LoadingRegion label={label} className={cn('grid gap-6 lg:grid-cols-[1fr_18rem]', className)}>
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <div className="mt-2 flex flex-col gap-2">
          {range(6).map((index) => (
            <Skeleton key={index} className={cn('h-3', index === 5 ? 'w-2/3' : 'w-full')} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
        {range(4).map((index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Form (label + input pairs and an action row). */
export function FormSkeleton({
  fields = 5,
  className,
  label,
}: SkeletonProps & { fields?: number }) {
  return (
    <LoadingRegion
      label={label}
      className={cn('flex max-w-2xl flex-col gap-5 rounded-lg border bg-card p-5', className)}
    >
      {range(fields).map((index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className={cn('h-9 w-full', index === fields - 1 && 'h-24')} />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>
    </LoadingRegion>
  );
}

export type PageSkeletonVariant = 'list' | 'cards' | 'table' | 'detail' | 'form' | 'dashboard';

/**
 * Whole-page placeholder (title block + body). The router uses it as the Suspense fallback while a
 * lazily loaded page chunk downloads; pages may use it for their first load too.
 */
export function PageSkeleton({
  variant = 'list',
  className,
  label,
}: SkeletonProps & { variant?: PageSkeletonVariant }) {
  return (
    <div className={cn('flex flex-col gap-6', className)} data-slot="page-skeleton">
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {variant === 'list' ? <ListSkeleton label={label} /> : null}
      {variant === 'cards' ? <CardGridSkeleton label={label} /> : null}
      {variant === 'table' ? <TableSkeleton label={label} /> : null}
      {variant === 'detail' ? <DetailSkeleton label={label} /> : null}
      {variant === 'form' ? <FormSkeleton label={label} /> : null}
      {variant === 'dashboard' ? (
        <LoadingRegion label={label} className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-lg lg:col-span-2" />
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg lg:col-span-2" />
        </LoadingRegion>
      ) : null}
    </div>
  );
}

/** Centred spinner-free placeholder for the very first session check (before any layout exists). */
export function FullPageLoader() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh items-center justify-center bg-background"
    >
      <span className="sr-only">{t('common.states.loading')}</span>
      <span aria-hidden="true" className="flex gap-1.5">
        <span className="size-2 animate-pulse rounded-full bg-primary/70" />
        <span className="size-2 animate-pulse rounded-full bg-primary/70 [animation-delay:150ms]" />
        <span className="size-2 animate-pulse rounded-full bg-primary/70 [animation-delay:300ms]" />
      </span>
    </div>
  );
}
