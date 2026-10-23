/** @jest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from '@/components/shared/pagination';
import { renderWithI18n, t } from '../utils/render-with-i18n';

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
    renderWithI18n(<Pagination page={1} totalPages={3} />);

    expect(screen.getByRole('button', { name: t('PAGINATION_PREVIOUS') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('PAGINATION_NEXT') })).toBeEnabled();
  });

  it('disables "Next" on the last page', () => {
    renderWithI18n(<Pagination page='3' totalPages={3} />);

    expect(screen.getByRole('button', { name: t('PAGINATION_PREVIOUS') })).toBeEnabled();
    expect(screen.getByRole('button', { name: t('PAGINATION_NEXT') })).toBeDisabled();
  });

  it('keeps existing search params when moving to the next page', async () => {
    mockSearchParams = new URLSearchParams('q=lamp&page=2');
    renderWithI18n(<Pagination page={2} totalPages={5} />);

    await userEvent.click(screen.getByRole('button', { name: t('PAGINATION_NEXT') }));

    expect(mockPush).toHaveBeenCalledWith('/search?page=3&q=lamp');
  });

  it('moves back one page', async () => {
    renderWithI18n(<Pagination page={2} totalPages={5} />);

    await userEvent.click(screen.getByRole('button', { name: t('PAGINATION_PREVIOUS') }));

    expect(mockPush).toHaveBeenCalledWith('/search?page=1');
  });

  it('supports a custom page param name', async () => {
    renderWithI18n(<Pagination page={1} totalPages={2} urlParamName='ordersPage' />);

    await userEvent.click(screen.getByRole('button', { name: t('PAGINATION_NEXT') }));

    expect(mockPush).toHaveBeenCalledWith('/search?ordersPage=2');
  });
});
