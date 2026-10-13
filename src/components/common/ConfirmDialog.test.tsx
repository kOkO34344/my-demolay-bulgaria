import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';
import { ForbiddenError } from '@/data/errors';
import { renderWithProviders, screen, waitFor } from '@/test';

import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';

function renderDialog(props: Partial<ConfirmDialogProps> = {}) {
  const onConfirm = props.onConfirm ?? vi.fn();
  const view = renderWithProviders(
    <ConfirmDialog
      trigger={<Button>Open</Button>}
      title="Deactivate account?"
      description="The member can no longer sign in."
      confirmLabel="Deactivate"
      variant="destructive"
      {...props}
      onConfirm={onConfirm}
    />,
    { persona: null },
  );
  return { ...view, onConfirm };
}

describe('ConfirmDialog', () => {
  it('opens as an accessible alert dialog and cancels without confirming', async () => {
    const { user, onConfirm } = renderDialog();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Deactivate account?' });
    expect(dialog).toHaveAccessibleDescription('The member can no longer sign in.');
    // Focus starts on the safe action.
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('gates the confirm button behind typed confirmation', async () => {
    const { user, onConfirm } = renderDialog({ confirmationText: 'martin.georgiev' });
    await user.click(screen.getByRole('button', { name: 'Open' }));

    const input = screen.getByLabelText(/To confirm, type/);
    const confirm = screen.getByRole('button', { name: 'Deactivate' });
    expect(input).toHaveFocus();
    expect(confirm).toBeDisabled();

    await user.type(input, 'martin.georgie');
    expect(confirm).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();

    await user.type(input, 'v');
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith({ reason: '' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows a pending state while an async confirm runs and closes when it resolves', async () => {
    let resolve: () => void = () => undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const { user } = renderDialog({ onConfirm, pendingLabel: 'Deactivating…' });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

    const pending = screen.getByRole('button', { name: 'Deactivating…' });
    expect(pending).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    resolve();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('stays open with a translated error when the async confirm fails', async () => {
    const onConfirm = vi.fn(() => Promise.reject(new ForbiddenError('permission_denied')));
    const { user } = renderDialog({ onConfirm });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText("You don't have permission to do this.")).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeEnabled();
  });

  it('requires a reason when asked and passes it (trimmed) to onConfirm', async () => {
    const { user, onConfirm } = renderDialog({ reason: { label: 'Reason' } });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const confirm = screen.getByRole('button', { name: 'Deactivate' });
    expect(screen.getByLabelText('Reason')).toHaveFocus();
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText('Reason'), '  Left the chapter  ');
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith({ reason: 'Left the chapter' });
  });

  it('translates its built-in labels', async () => {
    const { user } = renderWithProviders(
      <ConfirmDialog
        trigger={<Button>Отвори</Button>}
        title="Архивиране?"
        confirmationText="АРХИВ"
        onConfirm={() => undefined}
      />,
      { persona: null, lang: 'bg' },
    );
    await user.click(screen.getByRole('button', { name: 'Отвори' }));
    expect(screen.getByRole('button', { name: 'Отказ' })).toBeInTheDocument();
    expect(screen.getByLabelText(/За потвърждение въведете/)).toBeInTheDocument();
  });
});
