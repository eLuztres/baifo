/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from '@/components/shared/pagination';

const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
  mockSearchParams = new URLSearchParams();
  window.history.replaceState(null, '', '/search');
});

describe('Pagination', () => {
  it('disables "Previous" on the first page', () => {
    render(<Pagination page={1} totalPages={3} />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('disables "Next" on the last page', () => {
    render(<Pagination page='3' totalPages={3} />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('keeps existing search params when moving to the next page', async () => {
    mockSearchParams = new URLSearchParams('q=lamp&page=2');
    render(<Pagination page={2} totalPages={5} />);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(mockPush).toHaveBeenCalledWith('/search?page=3&q=lamp');
  });

  it('moves back one page', async () => {
    render(<Pagination page={2} totalPages={5} />);

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));

    expect(mockPush).toHaveBeenCalledWith('/search?page=1');
  });

  it('supports a custom page param name', async () => {
    render(<Pagination page={1} totalPages={2} urlParamName='ordersPage' />);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(mockPush).toHaveBeenCalledWith('/search?ordersPage=2');
  });
});
