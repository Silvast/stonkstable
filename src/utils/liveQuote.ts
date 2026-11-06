import { recordApiCalls } from './apiUsage';

/** Latest price from EODHD's Live (Delayed) endpoint. Stocks are delayed about 15 minutes. */
export interface LiveQuote {
  price: number;
  change: number | null;
  changePercent: number | null;
  /** Unix time in seconds of the last trade EODHD has, or null when unknown. */
  timestamp: number | null;
}

// EODHD sends "NA" for fields it has no value for.
const toNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseLiveQuote = (raw: unknown): LiveQuote | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const price = toNumber(record.close);
  if (price === null) return null;
  return {
    price,
    change: toNumber(record.change),
    changePercent: toNumber(record.change_p),
    timestamp: toNumber(record.timestamp),
  };
};

export const fetchLiveQuote = async (symbol: string, exchange: string, apiKey: string): Promise<LiveQuote | null> => {
  const token = apiKey.trim() || 'demo';
  try {
    recordApiCalls(1);
    const response = await fetch(`/api/eodhd/real-time/${symbol}.${exchange}?api_token=${token}&fmt=json`);
    if (!response.ok) return null;
    return parseLiveQuote(await response.json());
  } catch (err) {
    console.error('Error fetching live quote:', err);
    return null;
  }
};
