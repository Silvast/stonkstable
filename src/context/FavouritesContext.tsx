import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ExchangeCode, StockEntry } from './StockSelectionContext';
import { useAuth } from './AuthContext';
import {
  FAVOURITES_KEY,
  FavouriteStock,
  clearFavourites,
  favouriteId,
  loadFavourites,
  saveFavourites,
  toFavourite
} from '../utils/favouritesStorage';
import {
  CloudFavourite,
  createCloudFavourite,
  deleteCloudFavourites,
  listCloudFavourites
} from '../utils/favouritesCloud';

interface FavouritesValue {
  favourites: FavouriteStock[];
  isFavourite: (code: string, exchange: string) => boolean;
  addFavourite: (fav: FavouriteStock) => void;
  removeFavourite: (code: string, exchange: string) => void;
  toggleFavourite: (entry: StockEntry, exchange: ExchangeCode) => void;
  restoreFavourite: (fav: FavouriteStock) => void;
  syncing: boolean;
  syncError: string | null;
  clearSyncError: () => void;
}

const LOAD_ERROR = "Couldn't load favourites from your account";
const SAVE_ERROR = "Couldn't save to your account, try again";
const REFRESH_INTERVAL_MS = 30_000;

const idOf = (fav: FavouriteStock) => favouriteId(fav.code, fav.exchange);

const withoutRowId = ({ id: _id, ...fav }: CloudFavourite): FavouriteStock => fav;

const FavouritesContext = createContext<FavouritesValue | null>(null);

export const FavouritesProvider = ({ children }: { children: React.ReactNode }) => {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  const [state, setState] = useState(() => ({ list: loadFavourites(), local: true }));
  const favourites = state.list;
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const current = useRef(favourites);
  const lastPersisted = useRef(favourites);
  const signedInRef = useRef(signedIn);
  const session = useRef(0);
  const syncedSession = useRef<number | null>(null);
  const cloudIds = useRef(new Map<string, string[]>());
  const pendingCreates = useRef(new Map<string, Promise<CloudFavourite | null>>());
  const lastCloudLoad = useRef(0);

  const commit = useCallback((next: FavouriteStock[], local = !signedInRef.current) => {
    current.current = next;
    setState({ list: next, local });
  }, []);

  const applyCloudList = useCallback((list: CloudFavourite[]) => {
    const ids = new Map<string, string[]>();
    const unique: FavouriteStock[] = [];
    for (const fav of [...list].sort((a, b) => a.addedAt.localeCompare(b.addedAt))) {
      const existing = ids.get(idOf(fav));
      if (existing) {
        existing.push(fav.id);
      } else {
        ids.set(idOf(fav), [fav.id]);
        unique.push(withoutRowId(fav));
      }
    }
    cloudIds.current = ids;
    commit(unique, false);
  }, [commit]);

  useEffect(() => {
    if (!state.local || state.list === lastPersisted.current) return;
    lastPersisted.current = state.list;
    saveFavourites(state.list);
  }, [state]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== FAVOURITES_KEY || signedInRef.current) return;
      const loaded = loadFavourites();
      lastPersisted.current = loaded;
      commit(loaded, true);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [commit]);

  useEffect(() => {
    signedInRef.current = signedIn;

    if (!signedIn) {
      if (syncedSession.current === null) return;
      session.current += 1;
      syncedSession.current = null;
      cloudIds.current = new Map();
      pendingCreates.current = new Map();
      const local = loadFavourites();
      lastPersisted.current = local;
      commit(local, true);
      setSyncing(false);
      return;
    }

    if (syncedSession.current === session.current) return;
    const mySession = session.current;
    syncedSession.current = mySession;

    const syncWithAccount = async () => {
      setSyncing(true);
      lastCloudLoad.current = Date.now();
      try {
        const cloudList = await listCloudFavourites();
        const inCloud = new Set(cloudList.map(idOf));
        const toUpload = loadFavourites().filter(fav => !inCloud.has(idOf(fav)));
        const results = await Promise.allSettled(toUpload.map(fav => createCloudFavourite(fav)));
        if (session.current !== mySession) return;

        const uploaded = results.flatMap(result => (result.status === 'fulfilled' ? [result.value] : []));
        applyCloudList([...cloudList, ...uploaded]);
        if (uploaded.length === toUpload.length) {
          clearFavourites();
        } else {
          setSyncError(SAVE_ERROR);
        }
      } catch {
        if (session.current === mySession) setSyncError(LOAD_ERROR);
      } finally {
        if (session.current === mySession) setSyncing(false);
      }
    };

    syncWithAccount();
  }, [signedIn, commit, applyCloudList]);

  useEffect(() => {
    if (!signedIn) return;

    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastCloudLoad.current < REFRESH_INTERVAL_MS) return;
      lastCloudLoad.current = Date.now();
      const mySession = session.current;
      listCloudFavourites()
        .then(list => {
          if (session.current === mySession) applyCloudList(list);
        })
        .catch(() => undefined);
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [signedIn, applyCloudList]);

  const ids = useMemo(() => new Set(favourites.map(idOf)), [favourites]);

  const isFavourite = useCallback(
    (code: string, exchange: string) => ids.has(favouriteId(code, exchange)),
    [ids]
  );

  const addFavourite = useCallback((fav: FavouriteStock) => {
    const id = idOf(fav);
    if (current.current.some(existing => idOf(existing) === id)) return;
    commit([...current.current, fav]);
    if (!signedInRef.current) return;

    const mySession = session.current;
    const pending = createCloudFavourite(fav)
      .then(created => {
        if (session.current === mySession) {
          cloudIds.current.set(id, [...(cloudIds.current.get(id) ?? []), created.id]);
        }
        return created;
      })
      .catch(() => {
        if (session.current === mySession) {
          commit(current.current.filter(existing => idOf(existing) !== id));
          setSyncError(SAVE_ERROR);
        }
        return null;
      })
      .finally(() => {
        if (pendingCreates.current.get(id) === pending) pendingCreates.current.delete(id);
      });
    pendingCreates.current.set(id, pending);
  }, [commit]);

  const removeFavourite = useCallback((code: string, exchange: string) => {
    const id = favouriteId(code, exchange);
    const removed = current.current.find(existing => idOf(existing) === id);
    if (!removed) return;
    commit(current.current.filter(existing => idOf(existing) !== id));
    if (!signedInRef.current) return;

    const mySession = session.current;
    const knownRows = cloudIds.current.get(id) ?? [];
    const pending = pendingCreates.current.get(id);

    const deleteFromAccount = async () => {
      const created = pending ? await pending : null;
      const rows = [...new Set([...knownRows, ...(created ? [created.id] : [])])];
      if (rows.length === 0) return;
      try {
        await deleteCloudFavourites(rows);
        if (session.current === mySession) cloudIds.current.delete(id);
      } catch {
        if (session.current !== mySession) return;
        cloudIds.current.set(id, rows);
        commit([...current.current, removed]);
        setSyncError(SAVE_ERROR);
      }
    };

    deleteFromAccount();
  }, [commit]);

  const toggleFavourite = useCallback((entry: StockEntry, exchange: ExchangeCode) => {
    if (ids.has(favouriteId(entry.Code, exchange))) {
      removeFavourite(entry.Code, exchange);
    } else {
      addFavourite(toFavourite(entry, exchange));
    }
  }, [ids, addFavourite, removeFavourite]);

  const clearSyncError = useCallback(() => setSyncError(null), []);

  const value = useMemo<FavouritesValue>(() => ({
    favourites,
    isFavourite,
    addFavourite,
    removeFavourite,
    toggleFavourite,
    restoreFavourite: addFavourite,
    syncing,
    syncError,
    clearSyncError,
  }), [favourites, isFavourite, addFavourite, removeFavourite, toggleFavourite, syncing, syncError, clearSyncError]);

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
