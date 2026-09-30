/** @jest-environment jsdom */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteDialog from '@/components/shared/delete-dialog';
import { toast } from '@/hooks/use-toast';

jest.mock('@/hooks/use-toast', () => {
  const toast = jest.fn();
  return { toast, useToast: () => ({ toast }) };
});

const mockToast = toast as jest.Mock;

async function openDialog() {
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  return screen.findByRole('alertdialog');
}

describe('DeleteDialog', () => {
  it('asks for confirmation before running the action', async () => {
    const action = jest.fn();
    render(<DeleteDialog id='abc' action={action} />);

    const dialog = await openDialog();

    expect(dialog).toHaveTextContent('Are you absolutely sure?');
    expect(action).not.toHaveBeenCalled();
  });

  it('closes without calling the action on cancel', async () => {
    const action = jest.fn();
    render(<DeleteDialog id='abc' action={action} />);

    await openDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(action).not.toHaveBeenCalled();
  });

  it('deletes by id, closes and toasts on success', async () => {
    const action = jest.fn().mockResolvedValue({ success: true, message: 'Deleted' });
    render(<DeleteDialog id='abc' action={action} />);

    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(action).toHaveBeenCalledWith('abc');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(mockToast).toHaveBeenCalledWith({ description: 'Deleted' });
  });

  it('stays open and shows an error toast on failure', async () => {
    const action = jest.fn().mockResolvedValue({ success: false, message: 'Nope' });
    render(<DeleteDialog id='abc' action={action} />);

    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({ variant: 'destructive', description: 'Nope' })
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
