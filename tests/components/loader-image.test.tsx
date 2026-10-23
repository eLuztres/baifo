/** @jest-environment jsdom */
import { screen } from '@testing-library/react';
import LoaderImage from '@/components/shared/LoaderImage';
import { renderWithI18n, t } from '../utils/render-with-i18n';

describe('LoaderImage', () => {
  it('shows the turning ring by default', () => {
    const { container } = renderWithI18n(<LoaderImage />);

    expect(screen.getByRole('status', { name: t('LOADING') })).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it("shows the shop's own picture when one is set", () => {
    const { container } = renderWithI18n(<LoaderImage image='/brand/loader.png' />);

    expect(screen.getByRole('status', { name: t('LOADING') })).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', '/brand/loader.png');
  });
});
