/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import ExploreSearch from '@/components/shared/explore-search';

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/explore',
  useSearchParams: () => mockSearchParams,
}));

const renderSearch = () => render(<ExploreSearch placeholder='Search…' label='Search' clearLabel='Clear search' maxLength={80} />);
const setAddress = (search: string) => {
  mockSearchParams = new URLSearchParams(search);
  window.history.replaceState(null, '', `/explore${search ? `?${search}` : ''}`);
};

beforeEach(() => {
  jest.useFakeTimers();
  mockReplace.mockClear();
  setAddress('');
});

afterEach(() => jest.useRealTimers());

describe('ExploreSearch', () => {
  it('searches after a short typing pause, not on every letter', () => {
    renderSearch();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'b' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' bici ' } });
    expect(mockReplace).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(400));

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/explore?q=bici', { scroll: false });
  });

  it('keeps the chosen chips and the bare hoy flag', () => {
    setAddress('hoy&c=surf');
    renderSearch();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'tabla' } });
    act(() => jest.advanceTimersByTime(400));

    expect(mockReplace).toHaveBeenCalledWith('/explore?hoy&c=surf&q=tabla', { scroll: false });
  });

  it('does not undo a chip tapped during the typing pause', () => {
    renderSearch();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'bici' } });
    window.history.replaceState(null, '', '/explore?tipo=busco');
    act(() => jest.advanceTimersByTime(400));

    expect(mockReplace).toHaveBeenCalledWith('/explore?tipo=busco&q=bici', { scroll: false });
  });

  it('brings the whole feed back with the cross', () => {
    setAddress('q=bici');
    renderSearch();

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(mockReplace).toHaveBeenCalledWith('/explore', { scroll: false });
  });

  it('shows no cross while the field is empty', () => {
    renderSearch();

    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });
});
