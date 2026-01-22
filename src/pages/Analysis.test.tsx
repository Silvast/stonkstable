import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/utils/testHelpers';
import Analysis from './Analysis';

describe('Analysis', () => {
  it('renders placeholder content', () => {
    render(<Analysis />);
    expect(screen.getByRole('heading', { name: /Analysis/i })).toBeInTheDocument();
    expect(screen.getByText(/Content coming soon\./i)).toBeInTheDocument();
  });
});

