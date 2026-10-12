import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLocale } from '@/i18n/public';
import { cn } from '@/lib/utils';

import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { TableSkeleton } from './LoadingSkeletons';

export type SortDirection = 'asc' | 'desc';
export interface SortState {
  columnId: string;
  direction: SortDirection;
}

export interface DataTableColumn<T> {
  /** Stable id (also the sort key passed to onSortChange). */
  id: string;
  /** Translated column header. */
  header: string;
  /** Cell renderer. */
  cell: (row: T) => ReactNode;
  /**
   * Value used for CLIENT-side sorting (strings compare with the active locale, numbers numerically,
   * null/undefined last). Providing it makes the column sortable.
   */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Mark sortable when sorting happens on the server (controlled `sort` + `onSortChange`). */
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  /** Visually hide the header text (e.g. an actions column) — it stays available to screen readers. */
  hideHeader?: boolean;
  /**
   * Small-screen card layout:
   *  - `title`:   the card's heading line (bold, no label) — use for the name/title column
   *  - `default`: "Label  value" row
   *  - `full`:    value on its own full-width line (actions, long text), no label
   *  - `hidden`:  not shown on small screens
   */
  mobile?: 'title' | 'default' | 'full' | 'hidden';
  /** Cell contains its own buttons/links/menus — keeps them clickable above a row link. */
  interactive?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataTablePagination {
  /** 1-based page. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  /** Rows (undefined while the first load is pending). */
  data: T[] | undefined;
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** Accessible name of the table (rendered as a visually hidden caption unless `showCaption`). */
  caption: string;
  showCaption?: boolean;
  /** Show the skeleton (only when there is no data yet — refetches keep the rows visible). */
  isLoading?: boolean;
  /** Load error → ErrorState with retry. */
  error?: unknown;
  onRetry?: () => void;
  /** Custom empty state (default: "Nothing here yet"). Use the no-results copy when filters are active. */
  emptyState?: ReactNode;
  /** Filters/search/actions row above the table. */
  toolbar?: ReactNode;
  /** Controlled sort (server or client). Omit for uncontrolled client sorting. */
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  defaultSort?: SortState;
  /** Row selection (checkbox column). */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Rendered in the selection bar when rows are selected — keep bulk actions meaningful. */
  bulkActions?: (selectedIds: string[]) => ReactNode;
  /** Accessible per-row name used by checkboxes and the row action (e.g. the member's name). */
  getRowLabel?: (row: T) => string;
  /**
   * Makes each row open something (drawer/detail). The `title` column becomes a button covering the
   * row (keyboard + screen-reader accessible); interactive cells stay clickable.
   */
  onRowClick?: (row: T) => void;
  /** Client-side pagination page size (ignored when `pagination` is given). */
  pageSize?: number;
  /** Server-side pagination. */
  pagination?: DataTablePagination;
  className?: string;
}

const ALIGN = { start: 'text-left', center: 'text-center', end: 'text-right' } as const;

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  collator: Intl.Collator,
): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

/**
 * Typed, accessible data table for administration screens.
 *  - md+: dense semantic table (sortable headers with aria-sort, sticky header row, horizontal scroll
 *    region with a label when needed).
 *  - < md: the same rows restyled as stacked cards ("Label  value"), plus a sort select in the toolbar.
 *  - Built-in loading skeleton, empty state, error state with retry, selection and pagination.
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  caption,
  showCaption = false,
  isLoading = false,
  error,
  onRetry,
  emptyState,
  toolbar,
  sort: controlledSort,
  onSortChange,
  defaultSort,
  selectable = false,
  selectedIds: controlledSelected,
  onSelectionChange,
  bulkActions,
  getRowLabel,
  onRowClick,
  pageSize,
  pagination,
  className,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const { intlLocale } = useLocale();
  const sortSelectId = useId();

  const [internalSort, setInternalSort] = useState<SortState | null>(defaultSort ?? null);
  const sort = controlledSort !== undefined ? controlledSort : internalSort;
  const setSort = (next: SortState | null) => {
    if (controlledSort === undefined) setInternalSort(next);
    onSortChange?.(next);
  };

  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const selected = controlledSelected ?? internalSelected;
  const setSelected = (ids: string[]) => {
    if (!controlledSelected) setInternalSelected(ids);
    onSelectionChange?.(ids);
  };

  const [clientPage, setClientPage] = useState(1);

  const sortableColumns = columns.filter((c) => c.sortValue || c.sortable);

  // Client-side sorting whenever the sorted column has a `sortValue`; `sortable`-only columns are
  // sorted by the server (rows are shown in the order given).
  const sortedRows = useMemo(() => {
    const rows = data ?? [];
    if (!sort) return rows;
    const column = columns.find((c) => c.id === sort.columnId);
    if (!column?.sortValue) return rows;
    const accessor = column.sortValue;
    const collator = new Intl.Collator(intlLocale, { sensitivity: 'base', numeric: true });
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => factor * compareValues(accessor(a), accessor(b), collator));
  }, [data, sort, columns, intlLocale]);

  // Pagination (client or server).
  const total = pagination ? pagination.total : sortedRows.length;
  const effectivePageSize = pagination ? pagination.pageSize : (pageSize ?? 0);
  const pageCount = effectivePageSize > 0 ? Math.max(1, Math.ceil(total / effectivePageSize)) : 1;
  const page = Math.min(pagination ? pagination.page : clientPage, pageCount);
  const visibleRows =
    !pagination && effectivePageSize > 0
      ? sortedRows.slice((page - 1) * effectivePageSize, page * effectivePageSize)
      : sortedRows;
  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), pageCount);
    if (pagination) pagination.onPageChange(clamped);
    else setClientPage(clamped);
  };

  const visibleIds = visibleRows.map(getRowId);
  const selectedOnPage = visibleIds.filter((id) => selected.includes(id));
  const allOnPageSelected = visibleIds.length > 0 && selectedOnPage.length === visibleIds.length;
  const someOnPageSelected = selectedOnPage.length > 0 && !allOnPageSelected;

  const toggleSort = (columnId: string) => {
    if (!sort || sort.columnId !== columnId) setSort({ columnId, direction: 'asc' });
    else if (sort.direction === 'asc') setSort({ columnId, direction: 'desc' });
    else setSort(null);
  };

  const titleColumnId = (columns.find((c) => c.mobile === 'title') ?? columns[0])?.id;
  const hasRows = visibleRows.length > 0;
  const showSkeleton = isLoading && !data;

  const mobileSort =
    sortableColumns.length > 0 ? (
      <div className="flex items-center gap-2 md:hidden">
        <label htmlFor={sortSelectId} className="text-sm text-muted-foreground">
          {t('common.labels.sortBy')}
        </label>
        <Select
          value={sort ? `${sort.columnId}:${sort.direction}` : 'none'}
          onValueChange={(value) => {
            const [columnId, direction] = value.split(':');
            if (columnId && (direction === 'asc' || direction === 'desc'))
              setSort({ columnId, direction });
            else setSort(null);
          }}
        >
          <SelectTrigger id={sortSelectId} size="sm" className="min-w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('shell.table.defaultOrder')}</SelectItem>
            {sortableColumns.flatMap((column) => [
              <SelectItem key={`${column.id}:asc`} value={`${column.id}:asc`}>
                {t('shell.table.sortAscendingBy', { column: column.header })}
              </SelectItem>,
              <SelectItem key={`${column.id}:desc`} value={`${column.id}:desc`}>
                {t('shell.table.sortDescendingBy', { column: column.header })}
              </SelectItem>,
            ])}
          </SelectContent>
        </Select>
      </div>
    ) : null;

  const renderBody = () => {
    if (showSkeleton) return <TableSkeleton rows={6} columns={Math.min(columns.length, 6)} />;
    if (error && !hasRows) return <ErrorState error={error} onRetry={onRetry} variant="section" />;
    if (!hasRows) {
      return (
        <div className="rounded-lg border bg-card">
          {emptyState ?? (
            <EmptyState
              title={t('common.states.emptyTitle')}
              description={t('common.states.emptyDescription')}
            />
          )}
        </div>
      );
    }
    return (
      <div className="rounded-lg md:border md:bg-card md:shadow-xs">
        <Table
          scrollLabel={caption}
          containerClassName="max-md:overflow-visible md:rounded-lg"
          className="max-md:block"
          aria-busy={isLoading || undefined}
        >
          <TableCaption className={cn(!showCaption && 'sr-only', 'max-md:block')}>
            {caption}
          </TableCaption>
          <TableHeader className="max-md:sr-only">
            <TableRow className="hover:bg-transparent">
              {selectable ? (
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false
                    }
                    onCheckedChange={(checked) => {
                      const others = selected.filter((id) => !visibleIds.includes(id));
                      setSelected(checked === true ? [...others, ...visibleIds] : others);
                    }}
                    aria-label={t('shell.table.selectAllOnPage')}
                  />
                </TableHead>
              ) : null}
              {columns.map((column) => {
                const isSortable = Boolean(column.sortValue || column.sortable);
                const isSorted = sort?.columnId === column.id;
                const ariaSort = isSortable
                  ? isSorted
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                  : undefined;
                return (
                  <TableHead
                    key={column.id}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(ALIGN[column.align ?? 'start'], column.headerClassName)}
                  >
                    {column.hideHeader ? (
                      <span className="sr-only">{column.header}</span>
                    ) : isSortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className={cn(
                          '-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-semibold focus-ring hover:text-foreground',
                          isSorted && 'text-foreground',
                          column.align === 'end' && 'flex-row-reverse',
                        )}
                      >
                        {column.header}
                        {isSorted ? (
                          sort.direction === 'asc' ? (
                            <ArrowUpIcon aria-hidden="true" className="size-3.5" />
                          ) : (
                            <ArrowDownIcon aria-hidden="true" className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDownIcon aria-hidden="true" className="size-3.5 opacity-50" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody className="max-md:flex max-md:flex-col max-md:gap-3">
            {visibleRows.map((row) => {
              const id = getRowId(row);
              const isSelected = selected.includes(id);
              const rowLabel = getRowLabel?.(row) ?? id;
              return (
                <TableRow
                  key={id}
                  data-state={isSelected ? 'selected' : undefined}
                  className={cn(
                    'max-md:relative max-md:flex max-md:flex-col max-md:gap-1.5 max-md:rounded-lg max-md:border max-md:bg-card max-md:p-4 max-md:shadow-xs',
                    onRowClick && 'relative cursor-pointer',
                  )}
                >
                  {selectable ? (
                    <TableCell className="relative z-10 w-10 max-md:absolute max-md:top-4 max-md:right-4 max-md:p-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          setSelected(
                            checked === true
                              ? [...selected, id]
                              : selected.filter((value) => value !== id),
                          )
                        }
                        aria-label={t('shell.table.selectRow', { name: rowLabel })}
                      />
                    </TableCell>
                  ) : null}
                  {columns.map((column) => {
                    const mobile =
                      column.mobile ?? (column.id === titleColumnId ? 'title' : 'default');
                    const isTitle = column.id === titleColumnId;
                    const content = column.cell(row);
                    return (
                      <TableCell
                        key={column.id}
                        data-label={column.header}
                        className={cn(
                          ALIGN[column.align ?? 'start'],
                          column.interactive && 'relative z-10',
                          // small-screen card layout
                          'max-md:px-0 max-md:py-0 max-md:text-left max-md:whitespace-normal',
                          mobile === 'hidden' && 'max-md:hidden',
                          mobile === 'title' &&
                            cn(
                              'max-md:text-base max-md:font-semibold',
                              selectable && 'max-md:pr-10',
                            ),
                          mobile === 'default' &&
                            'max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-4 max-md:text-sm max-md:before:shrink-0 max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]',
                          mobile === 'full' && 'max-md:pt-2',
                          column.className,
                        )}
                      >
                        {isTitle && onRowClick ? (
                          <button
                            type="button"
                            onClick={() => onRowClick(row)}
                            className="text-left font-semibold underline-offset-4 focus-ring after:absolute after:inset-0 after:content-[''] hover:underline"
                          >
                            {content}
                          </button>
                        ) : (
                          content
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col gap-3', className)} data-slot="data-table">
      {toolbar || mobileSort ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          {toolbar ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">{toolbar}</div>
          ) : null}
          {hasRows ? mobileSort : null}
        </div>
      ) : null}

      {selectable && selected.length > 0 ? (
        <div
          role="region"
          aria-label={t('shell.table.selectionActions')}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-secondary px-3 py-2 text-sm text-secondary-foreground"
        >
          <span className="font-semibold" aria-live="polite">
            {t('common.count.selected', { count: selected.length })}
          </span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions?.(selected)}</div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected([])}>
            {t('shell.table.clearSelection')}
          </Button>
        </div>
      ) : null}

      {renderBody()}

      {hasRows && effectivePageSize > 0 && pageCount > 1 ? (
        <nav
          aria-label={t('common.a11y.pagination')}
          className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
        >
          <p className="tabular-nums-lining">
            {t('shell.table.showing', {
              from: (page - 1) * effectivePageSize + 1,
              to: Math.min(page * effectivePageSize, total),
              total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label={t('common.a11y.previousPage')}
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <span className="min-w-24 text-center tabular-nums-lining">
              {t('shell.table.page', { page, pages: pageCount })}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= pageCount}
              aria-label={t('common.a11y.nextPage')}
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
