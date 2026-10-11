import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { ExchangeCode } from '../context/StockSelectionContext';
import { FavouriteStock } from './favouritesStorage';
import { unwrap } from './amplify';

export interface CloudFavourite extends FavouriteStock {
  id: string;
}

const EXCHANGES: readonly string[] = ['US', 'HE', 'LSE'] satisfies ExchangeCode[];

const client = () => generateClient<Schema>();

const toCloudFavourite = (row: unknown): CloudFavourite | null => {
  if (!row || typeof row !== 'object') return null;
  const { id, code, exchange, name, currency, addedAt, createdAt } = row as Record<string, unknown>;
  if (typeof id !== 'string' || typeof code !== 'string' || code === '') return null;
  if (typeof exchange !== 'string' || !EXCHANGES.includes(exchange)) return null;

  return {
    id,
    code,
    exchange: exchange as ExchangeCode,
    name: typeof name === 'string' ? name : '',
    currency: typeof currency === 'string' ? currency : '',
    addedAt: typeof addedAt === 'string' ? addedAt : typeof createdAt === 'string' ? createdAt : '',
  };
};

export async function listCloudFavourites(): Promise<CloudFavourite[]> {
  const favourites = client().models.Favourite;
  const rows: unknown[] = [];
  let nextToken: string | null | undefined = undefined;

  do {
    const result: Awaited<ReturnType<typeof favourites.list>> = await favourites.list({ nextToken });
    rows.push(...unwrap(result));
    nextToken = result.nextToken;
  } while (nextToken);

  return rows.map(toCloudFavourite).filter((fav): fav is CloudFavourite => fav !== null);
}

export async function createCloudFavourite(fav: FavouriteStock): Promise<CloudFavourite> {
  const created = toCloudFavourite(unwrap(await client().models.Favourite.create(fav)));
  if (!created) throw new Error(`Could not save ${fav.code}.${fav.exchange}`);
  return created;
}

export async function deleteCloudFavourites(ids: string[]): Promise<void> {
  const favourites = client().models.Favourite;
  const results = await Promise.all(ids.map(id => favourites.delete({ id })));
  results.forEach(unwrap);
}
