import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../test/utils/testHelpers';
import StockTablePage from './StockTablePage';
import { mockStockData, mockSuccessResponse } from '../test/mocks/stockApi';

describe('StockTablePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => mockSuccessResponse(mockStockData));
  });

  it('renders StockTable within the page', async () => {
    render(<StockTablePage />);

    await waitFor(() => {
      expect(screen.getByText(/Stock Search Options/i)).toBeInTheDocument();
    });
  });
});

