import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ExchangeCode, StockEntry } from './StockSelectionContext';
import {
  FAVOURITES_KEY,
  FavouriteStock,
  favouriteId,
  loadFavourites,
  saveFavourites,
  toFavourite
} from '../utils/favouritesStorage';

interface FavouritesValue {
  favourites: FavouriteStock[];
  isFavourite: (code: string, exchange: string) => boolean;
  addFavourite: (fav: FavouriteStock) => void;
  removeFavourite: (code: string, exchange: string) => void;
  toggleFavourite: (entry: StockEntry, exchange: ExchangeCode) => void;
  restoreFavourite: (fav: FavouriteStock) => void;
}

const FavouritesContext = createContext<FavouritesValue | null>(null);

export const FavouritesProvider = ({ children }: { children: React.ReactNode }) => {
  const [favourites, setFavourites] = useState<FavouriteStock[]>(loadFavourites);
  const lastPersisted = useRef(favourites);

  useEffect(() => {
    if (favourites === lastPersisted.current) return;
    lastPersisted.current = favourites;
    saveFavourites(favourites);
  }, [favourites]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== FAVOURITES_KEY) return;
      const loaded = loadFavourites();
      lastPersisted.current = loaded;
      setFavourites(loaded);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const ids = useMemo(
    () => new Set(favourites.map(fav => favouriteId(fav.code, fav.exchange))),
    [favourites]
  );

  const isFavourite = useCallback(
    (code: string, exchange: string) => ids.has(favouriteId(code, exchange)),
    [ids]
  );

  const addFavourite = useCallback((fav: FavouriteStock) => {
    setFavourites(current => {
      const id = favouriteId(fav.code, fav.exchange);
      return current.some(existing => favouriteId(existing.code, existing.exchange) === id)
        ? current
        : [...current, fav];
    });
  }, []);

  const removeFavourite = useCallback((code: string, exchange: string) => {
    const id = favouriteId(code, exchange);
    setFavourites(current => current.filter(fav => favouriteId(fav.code, fav.exchange) !== id));
  }, []);

  const toggleFavourite = useCallback((entry: StockEntry, exchange: ExchangeCode) => {
    if (ids.has(favouriteId(entry.Code, exchange))) {
      removeFavourite(entry.Code, exchange);
    } else {
      addFavourite(toFavourite(entry, exchange));
    }
  }, [ids, addFavourite, removeFavourite]);

  const value = useMemo<FavouritesValue>(() => ({
    favourites,
    isFavourite,
    addFavourite,
    removeFavourite,
    toggleFavourite,
    restoreFavourite: addFavourite,
  }), [favourites, isFavourite, addFavourite, removeFavourite, toggleFavourite]);

  return (
    <FavouritesContext.Provider value={value}>
      {children}
    </FavouritesContext.Provider>
  );
};

export const useFavourites = (): FavouritesValue => {
  const context = useContext(FavouritesContext);
  if (!context) {
    throw new Error('useFavourites must be used within a FavouritesProvider');
  }
  return context;
};
