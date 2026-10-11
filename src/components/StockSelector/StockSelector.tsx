import React, { useMemo } from 'react';
import {
  Autocomplete,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { ExchangeCode, StockEntry, useStockSelection } from '../../context/StockSelectionContext';
import { useFavourites } from '../../context/FavouritesContext';
import { useAuth } from '../../context/AuthContext';
import FavouriteToggle from '../Favourites/FavouriteToggle';

const MAX_OPTIONS = 100; // Limit results to prevent performance issues

const optionLabel = (option: StockEntry) => `${option.Name} (${option.Code})`;

interface StockSelectorProps {
  loading?: boolean;
}

const StockSelector = ({ loading = false }: StockSelectorProps) => {
  const {
    exchange,
    apiKey,
    selectedStock,
    stockOptions,
    setExchange,
    setApiKey,
    rememberOnDevice,
    setRememberOnDevice,
    apiKeySaveError,
    setSelectedStock
  } = useStockSelection();
  const { favourites, isFavourite } = useFavourites();
  const { status } = useAuth();
  const apiKeyHint = apiKeySaveError ?? (status === 'signedIn' ? 'Saved to your account' : undefined);

  const optionsByCode = useMemo(
    () => new Map(stockOptions.map(option => [option.Code, option])),
    [stockOptions]
  );

  const filterOptions = (options: StockEntry[], { inputValue }: { inputValue: string }) => {
    const input = inputValue.toLowerCase();
    const matches = (option: StockEntry) =>
      option.Name.toLowerCase().includes(input) || option.Code.toLowerCase().includes(input);

    const result = favourites
      .filter(fav => fav.exchange === exchange)
      .map(fav => optionsByCode.get(fav.code))
      .filter((option): option is StockEntry => !!option && matches(option))
      .slice(0, MAX_OPTIONS);

    for (const option of options) {
      if (result.length >= MAX_OPTIONS) break;
      if (matches(option) && !isFavourite(option.Code, exchange)) result.push(option);
    }
    return result;
  };

  const handleStockChange = (_event: React.SyntheticEvent, newValue: StockEntry | null) => {
    setSelectedStock(newValue);
  };

  const handleStockExchangeChange = (event: SelectChangeEvent) => {
    setExchange(event.target.value as ExchangeCode);
  };

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 2, sm: 2 }}
      alignItems="flex-start"
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ width: { xs: '100%', sm: '60%', md: '40%' } }}
      >
        <Autocomplete
          id="stock-symbol-autocomplete"
          options={stockOptions}
          getOptionLabel={optionLabel}
          value={selectedStock}
          onChange={handleStockChange}
          isOptionEqualToValue={(option, value) => option.Code === value.Code}
          filterOptions={filterOptions}
          groupBy={(option) => (isFavourite(option.Code, exchange) ? 'Favourites' : 'All stocks')}
          renderOption={(props, option) => {
            const { key: _key, ...optionProps } = props as typeof props & { key: string };
            return (
              <Box component="li" key={option.Code} {...optionProps}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                  <span>{optionLabel(option)}</span>
                  <FavouriteToggle stock={option} exchange={exchange} size="small" stopPropagation />
                </Box>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Stock Symbol"
              variant="outlined"
              size="small"
              aria-label="Search for a stock by name or symbol"
              sx={{
                flexGrow: 1,
                minWidth: 80,
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.9rem', sm: 'inherit' }
                },
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.9rem', sm: 'inherit' }
                }
              }}
            />
          )}
          sx={{ flexGrow: 1 }}
          loading={loading}
          loadingText="Loading stocks..."
          noOptionsText="No stocks found"
        />

        <FormControl
          size="small"
          sx={{
            width: { xs: 110, sm: 120 },
            '& .MuiInputLabel-root': {
              fontSize: { xs: '0.9rem', sm: 'inherit' }
            },
            '& .MuiSelect-select': {
              fontSize: { xs: '0.9rem', sm: 'inherit' }
            }
          }}
        >
          <InputLabel id="stock-exchange-label">Exchange</InputLabel>
          <Select
            labelId="stock-exchange-label"
            value={exchange}
            label="Exchange"
            onChange={handleStockExchangeChange}
          >
            <MenuItem value="US">US</MenuItem>
            <MenuItem value="HE">HE</MenuItem>
            <MenuItem value="LSE">LSE</MenuItem>
          </Select>
        </FormControl>

        <FavouriteToggle stock={selectedStock} exchange={exchange} />
      </Stack>

      <Stack sx={{ flexGrow: 1, width: { xs: '100%', sm: '40%', md: '60%' } }}>
        <TextField
          label="API Key"
          value={apiKey}
          onChange={handleApiKeyChange}
          placeholder="Optional (defaults to 'demo')"
          variant="outlined"
          size="small"
          fullWidth
          helperText={apiKeyHint}
          error={apiKeySaveError !== null}
          sx={{
            '& .MuiInputLabel-root': {
              fontSize: { xs: '0.9rem', sm: 'inherit' }
            },
            '& .MuiInputBase-input': {
              fontSize: { xs: '0.9rem', sm: 'inherit' }
            }
          }}
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
