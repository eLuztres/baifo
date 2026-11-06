/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterDropdown from '@/components/admin/filter-dropdown';

const mockPush = jest.fn();
let mockSearch = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/explore',
  useSearchParams: () => mockSearch,
}));

const OPTIONS = [
  { value: '0-10', label: 'Hasta 10 €', count: 3 },
  { value: '100-250', label: '100 – 250 €', shortLabel: '100–250 €', count: 13 },
  { value: '500-', label: 'Más de 500 €', shortLabel: '+500 €', count: 6 },
];

const renderPrice = (selected: string[] = []) =>
  render(<FilterDropdown label='Precio' allLabel='Todos' param='precio' options={OPTIONS} selected={selected} isCompact isSingleChoice />);

beforeEach(() => {
  mockPush.mockReset();
  mockSearch = new URLSearchParams('tipo=busco');
});

describe('FilterDropdown', () => {
  it('shows the short label on the button once chosen, the full one in the menu', async () => {
    renderPrice(['500-']);
    expect(screen.getByRole('button')).toHaveTextContent('+500 €');
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menuitemcheckbox', { name: /Más de 500 €/ })).toBeInTheDocument();
  });

  it('keeps the full label when there is no short one', () => {
    renderPrice(['0-10']);
    expect(screen.getByRole('button')).toHaveTextContent('Hasta 10 €');
  });

  it('puts the choice in the link and keeps the other filters', async () => {
    renderPrice();
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: /100 – 250 €/ }));
    expect(mockPush).toHaveBeenCalledWith('/explore?tipo=busco&precio=100-250', { scroll: false });
  });

  it('takes the choice out of the link with "Todos"', async () => {
    mockSearch = new URLSearchParams('tipo=busco&precio=0-10');
    renderPrice(['0-10']);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Todos' }));
    expect(mockPush).toHaveBeenCalledWith('/explore?tipo=busco', { scroll: false });
  });
});
