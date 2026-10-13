import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';
import { renderWithProviders, screen, within } from '@/test';

import { DataTable, type DataTableColumn, type DataTableProps } from './DataTable';

interface Row {
  id: string;
  name: string;
  events: number;
  status: string;
}

const ROWS: Row[] = [
  { id: 'r1', name: 'Bistra', events: 3, status: 'Active' },
  { id: 'r2', name: 'Asen', events: 10, status: 'Suspended' },
  { id: 'r3', name: 'Velin', events: 1, status: 'Active' },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.name, sortValue: (r) => r.name, mobile: 'title' },
  {
    id: 'events',
    header: 'Events',
    cell: (r) => r.events,
    sortValue: (r) => r.events,
    align: 'end',
  },
  { id: 'status', header: 'Status', cell: (r) => r.status },
];

function renderTable(props: Partial<DataTableProps<Row>> = {}) {
  return renderWithProviders(
    <DataTable<Row>
      data={ROWS}
      columns={COLUMNS}
      getRowId={(r) => r.id}
      getRowLabel={(r) => r.name}
      caption="Members"
      {...props}
    />,
    { persona: null },
  );
}

/** First-column text of every body row, in DOM order. */
function nameOrder(): string[] {
  const table = screen.getByRole('table', { name: 'Members' });
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '');
}

describe('DataTable', () => {
  it('renders an accessible table with a caption and column headers', () => {
    renderTable();
    const table = screen.getByRole('table', { name: 'Members' });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(3);
    expect(nameOrder()).toEqual(['Bistra', 'Asen', 'Velin']);
  });

  it('sorts by clickable headers and exposes aria-sort (asc → desc → none)', async () => {
    const { user } = renderTable();
    const nameHeader = screen.getByRole('columnheader', { name: /Name/ });
    const statusHeader = screen.getByRole('columnheader', { name: 'Status' });
    expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    expect(statusHeader).not.toHaveAttribute('aria-sort');

    await user.click(within(nameHeader).getByRole('button', { name: 'Name' }));
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(nameOrder()).toEqual(['Asen', 'Bistra', 'Velin']);

    await user.click(within(nameHeader).getByRole('button', { name: 'Name' }));
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    expect(nameOrder()).toEqual(['Velin', 'Bistra', 'Asen']);

    await user.click(within(nameHeader).getByRole('button', { name: 'Name' }));
    expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    expect(nameOrder()).toEqual(['Bistra', 'Asen', 'Velin']);
  });

  it('sorts numbers numerically and only marks the active column', async () => {
    const { user } = renderTable();
    const eventsHeader = screen.getByRole('columnheader', { name: /Events/ });
    await user.click(within(eventsHeader).getByRole('button'));
    expect(eventsHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'none');
    expect(nameOrder()).toEqual(['Velin', 'Bistra', 'Asen']);
  });

  it('reports controlled sort changes to the caller', async () => {
    const onSortChange = vi.fn();
    const { user } = renderTable({ sort: null, onSortChange });
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenCalledWith({ columnId: 'name', direction: 'asc' });
    // Controlled: order unchanged until the parent passes the new sort back.
    expect(nameOrder()).toEqual(['Bistra', 'Asen', 'Velin']);
  });

  it('shows the default empty state, or a custom one', () => {
    const { unmount } = renderTable({ data: [] });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    unmount();

    renderTable({ data: [], emptyState: <p>No members match “Zara”.</p> });
    expect(screen.getByText('No members match “Zara”.')).toBeInTheDocument();
  });

  it('shows a loading skeleton before the first data arrives', () => {
    renderTable({ data: undefined, isLoading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an error state with a working retry button', async () => {
    const onRetry = vi.fn();
    const { user } = renderTable({ data: undefined, error: new Error('boom'), onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('supports row selection with bulk actions and an accessible row action', async () => {
    const onRowClick = vi.fn();
    const { user } = renderTable({
      selectable: true,
      onRowClick,
      bulkActions: (ids) => <Button size="sm">Export {ids.length}</Button>,
    });
    await user.click(screen.getByRole('checkbox', { name: 'Select Asen' }));
    expect(screen.getByRole('region', { name: 'Actions for selected rows' })).toHaveTextContent(
      '1 selected',
    );
    expect(screen.getByRole('button', { name: 'Export 1' })).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(screen.getByRole('button', { name: 'Export 3' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Velin' }));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[2]);
  });

  it('paginates on the client', async () => {
    const { user } = renderTable({ pageSize: 2 });
    const pager = screen.getByRole('navigation', { name: /pagination/i });
    expect(pager).toHaveTextContent('1–2 of 3');
    expect(nameOrder()).toEqual(['Bistra', 'Asen']);
    await user.click(within(pager).getByRole('button', { name: /next/i }));
    expect(pager).toHaveTextContent('3–3 of 3');
    expect(nameOrder()).toEqual(['Velin']);
  });
});
