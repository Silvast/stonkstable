import type { ExchangeCode } from '../context/StockSelectionContext';

/**
 * Nordnet search page: `https://www.nordnet.fi/etsi?q=<query>`.
 *
 * Checked on nordnet.fi on 2026-10-22 (build `pr-13507`):
 * - Nordnet documents this URL format itself in its OpenSearch descriptor,
 *   https://www.nordnet.fi/opensearch.xml:
 *   `<Url type="text/html" method="get" template="https://www.nordnet.fi/etsi?q={searchTerms}"/>`
 * - The route table in Nordnet's own bundle agrees: `Search: { fi: '/etsi*', en: '/search*', se: '/sok*', dk: '/soeg*' }`.
 * - The search box in the header is backed by
 *   https://www.nordnet.fi/opensearchsuggestions?q=<query>, which answers `[query, [suggestions]]`
 *   and matches tickers as well as names (NOKIA → Nokia Corporation, AAPL → Apple, VOD → Vodafone Group PLC).
 * - Instrument pages live at `/osakkeet/kurssit/<slug>` (`nokia-xhel`), but the slug cannot be derived
 *   from a ticker — `/osakkeet/kurssit/nokia` 404s — which is why we search instead.
 * - At the time of checking `/etsi?q=…` answers 404 and `/search?q=…` redirects to the front page without
 *   opening the search box, i.e. the page is announced but not served yet. The link follows the announced
 *   format so it starts working as soon as the page does; this constant is the one place to change.
 */
const NORDNET_SEARCH_URL = 'https://www.nordnet.fi/etsi';

/** Last-resort query so the link always carries something to search for. */
const MARKET_TERMS: Record<ExchangeCode, string> = { US: 'Nasdaq', HE: 'Helsinki', LSE: 'LSE' };

/**
 * Search link for a stock on nordnet.fi.
 *
 * The ticker is the query because Nordnet's search matches it best on every exchange we support
 * ("Orion Oyj" finds nothing while ORION does, and "Apple Inc." matches an unrelated ETF while AAPL does).
 * The name is only used when the ticker is missing.
 */
export function nordnetUrl(symbol: string, exchange: ExchangeCode, name?: string): string {
  const query = symbol.trim() || name?.trim() || MARKET_TERMS[exchange];
  return `${NORDNET_SEARCH_URL}?q=${encodeURIComponent(query)}`;
}