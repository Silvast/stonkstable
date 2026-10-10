import React from 'react';
import {
  Autocomplete,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField
} from '@mui/material';
import { ExchangeCode, StockEntry, useStockSelection } from '../../context/StockSelectionContext';

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
    setSelectedStock
  } = useStockSelection();

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
          getOptionLabel={(option) => `${option.Name} (${option.Code})`}
          value={selectedStock}
          onChange={handleStockChange}
          isOptionEqualToValue={(option, value) => option.Code === value.Code}
          filterOptions={(options, state) => {
            const inputValue = state.inputValue.toLowerCase();
            const MAX_OPTIONS = 100; // Limit results to prevent performance issues
            const result: StockEntry[] = [];
            for (const option of options) {
              if (option.Name.toLowerCase().includes(inputValue) ||
                option.Code.toLowerCase().includes(inputValue)) {
                result.push(option);
                if (result.length >= MAX_OPTIONS) break;
              }
            }
            return result;
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
      </Stack>

      <TextField
        label="API Key"
        value={apiKey}
        onChange={handleApiKeyChange}
        placeholder="Optional (defaults to 'demo')"
        variant="outlined"
        size="small"
        fullWidth
        sx={{
          flexGrow: 1,
          width: { xs: '100%', sm: '40%', md: '60%' },
          '& .MuiInputLabel-root': {
            fontSize: { xs: '0.9rem', sm: 'inherit' }
          },
          '& .MuiInputBase-input': {
            fontSize: { xs: '0.9rem', sm: 'inherit' }
          }
        }}
      />
    </Stack>
  );
};

export default StockSelector;
