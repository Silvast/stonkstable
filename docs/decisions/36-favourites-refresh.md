# Decision: loading favourites within the EODHD 20 calls/day limit (#36)

Status: **proposed**. The endpoint table below is based on the EODHD docs as quoted in the issue.
It has **not** been verified against a live call with a free key. The usage-counter check in the
EODHD dashboard is still open (see "Open items").

## Research answers

1. **Is there a batch request that is cheaper per stock?** No. Every endpoint we considered charges
   per ticker. Batching (`real-time?s=B,C`) saves HTTP round trips but not API calls. The only true bulk
   endpoint (`eod-bulk-last-day`) costs 100 + 1 per ticker and is not on the free plan.
2. **Best use of 20 calls/day:** keep data in the browser for the session (and across reloads),
   fetch EOD incrementally (only from the last stored date), and load news only on demand.
3. **UI:** a "Refresh favourites (N calls)" button that shows the cost before running. It skips
   symbols already fresh today and stops before `DAILY_CALL_BUDGET` (20, in `src/utils/apiUsage.ts`).

## Chosen approach

- **Browser-side, not #31.** The backend cache (#31) is not built yet. The browser can do this now with
  the existing `recordApiCalls` counter. Once #31 exists, the same "fresh today" check can move to the
  backend without changing the UI.
- **EOD:** 1 call per favourite per trading day, incremental from the last stored date.
- **News:** 5 calls per ticker, loaded only when the Analysis news panel is opened, cached per day.
- **Refresh action:** loops favourites sequentially, checks the budget before each call, and reports
  what was skipped.

## Expected daily cost (N favourites)

| Action | Calls |
|---|---|
| Full refresh of favourites (EOD, first run or new symbols only) | N (first run), 0–N afterwards |
| Refresh once per trading day after the first run | N |
| Analysis of one stock with news (EOD + 5 news) | 6 |

Examples with the 20-call budget, refreshing once a day:
- N = 10: 10 calls for the refresh, leaving 10 (one Analysis with news, plus spare).
- N = 20: the whole budget goes to the refresh; no Analysis with news that day.
- N > 20: not feasible on the free plan. Refresh in batches over several days, or upgrade.

## Open items

- Verify the endpoint costs in the table with a real free-key call and the dashboard counter.
- Confirm the `real-time?s=` cost (1 per ticker) before any intraday feature is built.

## Proposed follow-up issues (to be filed by a maintainer)

1. **Favourites refresh button**: "Refresh favourites (N calls)" with a cost preview, budget guard
   against `DAILY_CALL_BUDGET`, and skipping of symbols already fresh today.
2. **Incremental EOD store**: per-symbol history in IndexedDB or localStorage, fetching only from the
   last stored date.
3. **On-demand news with daily cache**: load news only when the panel opens; cache per symbol per day.
4. **Intraday quotes (optional)**: `real-time?s=` batch for favourites, only if intraday prices are wanted.
5. **Move the freshness check to the backend** once #31 lands (links to #23 scanner and #26 scheduled scan).
