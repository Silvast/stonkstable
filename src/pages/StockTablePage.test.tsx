import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../test/utils/testHelpers';
import StockTablePage from './StockTablePage';
import { mockStockData, mockSuccessResponse } from '../test/mocks/stockApi';

describe('StockTablePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(() => mockSuccessResponse(mockStockData)));
  });

  it('renders StockTable within the page', async () => {
    render(<StockTablePage />);

    expect(screen.getByRole('button', { name: 'Fetch' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Daily prices' })).toBeInTheDocument();
  });
});
