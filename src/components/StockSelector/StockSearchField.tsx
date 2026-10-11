import React, { useMemo } from 'react';
import { Autocomplete, Box, InputAdornment, SxProps, TextField, Theme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { StockEntry, useStockSelection } from '../../context/StockSelectionContext';
import { useFavourites } from '../../context/FavouritesContext';
import FavouriteToggle from '../Favourites/FavouriteToggle';
import { tokens } from '../../theme';

const MAX_OPTIONS = 100; // Limit results to prevent performance issues

const optionLabel = (option: StockEntry) => `${option.Name} (${option.Code})`;

interface StockSearchFieldProps {
  loading?: boolean;
  sx?: SxProps<Theme>;
}

const StockSearchField = ({ loading = false, sx }: StockSearchFieldProps) => {
  const { exchange, selectedStock, stockOptions, setSelectedStock } = useStockSelection();
  const { favourites, isFavourite } = useFavourites();

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

  return (
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
          placeholder="Search stocks"
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <>
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: tokens.textSecondary }} />
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
            },
            htmlInput: { ...params.inputProps, 'aria-label': 'Stock Symbol' },
          }}
          sx={{ '& .MuiOutlinedInput-root': { minHeight: 44 } }}
        />
      )}
      sx={sx}
      loading={loading}
      loadingText="Loading stocks..."
      noOptionsText="No stocks found"
    />
  );
};

export default StockSearchField;
