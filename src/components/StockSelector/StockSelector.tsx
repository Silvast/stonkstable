import React from 'react';
import { Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';
import { useStockSelection } from '../../context/StockSelectionContext';
import { useAuth } from '../../context/AuthContext';
import FavouriteToggle from '../Favourites/FavouriteToggle';
import StockSearchField from './StockSearchField';
import ExchangeToggle from './ExchangeToggle';

interface StockSelectorProps {
  loading?: boolean;
}

const StockSelector = ({ loading = false }: StockSelectorProps) => {
  const {
    exchange,
    apiKey,
    selectedStock,
    setApiKey,
    rememberOnDevice,
    setRememberOnDevice,
    apiKeySaveError,
  } = useStockSelection();
  const { status } = useAuth();
  const apiKeyHint = apiKeySaveError ?? (status === 'signedIn' ? 'Saved to your account' : undefined);

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
      <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap sx={{ flex: '2 1 420px' }}>
        <StockSearchField loading={loading} sx={{ flex: '1 1 260px' }} />
        <ExchangeToggle />
        <FavouriteToggle stock={selectedStock} exchange={exchange} bordered />
      </Stack>

      <Stack sx={{ flex: '1 1 260px' }}>
        <TextField
          label="API Key"
          value={apiKey}
          onChange={handleApiKeyChange}
          placeholder="Optional (defaults to 'demo')"
          size="small"
          fullWidth
          helperText={apiKeyHint}
          error={apiKeySaveError !== null}
        />
        <FormControlLabel
          control={(
            <Checkbox
              size="small"
              checked={rememberOnDevice}
              onChange={(event) => setRememberOnDevice(event.target.checked)}
            />
          )}
          label="Remember on this device"
          slotProps={{ typography: { variant: 'body2', color: 'text.secondary' } }}
        />
      </Stack>
    </Stack>
  );
};

export default StockSelector;
