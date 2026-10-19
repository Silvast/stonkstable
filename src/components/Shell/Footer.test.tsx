import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils/testHelpers';
import Footer from './Footer';

describe('Footer', () => {
    it('renders a footer (contentinfo) landmark', () => {
        render(<Footer />);

        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('shows the app version and build hash', () => {
        render(<Footer />);

        const version = screen.getByTestId('app-version');
        const text = version.textContent ?? '';
        expect(text).toMatch(/^v\S+\s·\s\S+$/);
    });

    it('exposes the version and build hash to assistive tech', () => {
        render(<Footer />);

        const version = screen.getByTestId('app-version');
        const ariaLabel = version.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/^App version .+, build .+$/);
        expect(version.getAttribute('title')).toMatch(/^Build .+ \(.+\)$/);
    });
});
