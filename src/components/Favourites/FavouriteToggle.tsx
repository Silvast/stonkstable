import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { ExchangeCode, StockEntry } from '../../context/StockSelectionContext';
import { useFavourites } from '../../context/FavouritesContext';

interface FavouriteToggleProps {
  stock: StockEntry | null;
  exchange: ExchangeCode;
  size?: 'small' | 'medium';
  stopPropagation?: boolean;
}

const FavouriteToggle = ({ stock, exchange, size = 'medium', stopPropagation = false }: FavouriteToggleProps) => {
  const { isFavourite, toggleFavourite } = useFavourites();
  const isFav = stock !== null && isFavourite(stock.Code, exchange);

  const stop = (event: React.SyntheticEvent) => {
    if (stopPropagation) event.stopPropagation();
  };

  const handleClick = (event: React.MouseEvent) => {
    stop(event);
    if (stock) toggleFavourite(stock, exchange);
  };

  const ariaLabel = stock === null
    ? 'Add to favourites'
    : isFav ? `Remove ${stock.Code} from favourites` : `Add ${stock.Code} to favourites`;

  return (
    <Tooltip title={isFav ? 'Remove from favourites' : 'Add to favourites'}>
      <span>
        <IconButton
          size={size}
          aria-label={ariaLabel}
          aria-pressed={isFav}
          disabled={stock === null}
          onClick={handleClick}
          onMouseDown={stop}
          onFocus={stop}
        >
          {isFav
            ? <StarIcon fontSize={size} sx={{ color: 'primary.main' }} />
            : <StarBorderIcon fontSize={size} sx={{ color: stock === null ? 'action.disabled' : 'text.secondary' }} />}
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default FavouriteToggle;
