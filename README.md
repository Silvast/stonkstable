# Stock tables
## General
This is an extremely simple way of showing historical values of stocks. There are multiple excellent services that present stock data as graphs, but I couldn't find any that show tables with change % of historical data. When shorting, I find it usefull to look at an individual stock and their change % over a month or so. 

![Screenshot of the app results](https://github.com/Silvast/stonkstable/blob/main/public/Screenshot%20From%202025-04-17%2008-41-25.png)

## API Key
This app does not have a backend (cause I'm lazy), so you need to give your own eodhd.com api key in the form. Since you do not always want to paste your key, you can also use url that has apikey as query param, e.g.  `https://stonks.ansku.fail/?apikey=1234`
You can obtain your own apikey (it does cost though) from [eohd.com](https://eodhd.com/pricing).

## CORS / Proxy
`eodhd.com` does not return browser CORS headers for your frontend origin, so direct browser calls can fail with:
`No 'Access-Control-Allow-Origin' header`.

This repository now includes an Amplify function proxy in `amplify/functions/eodProxy/` and an HTTP API route in `amplify/backend.ts` that adds:
- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Methods`

After deploying Amplify backend changes, set this frontend env var to the API URL output:

```bash
VITE_EOD_PROXY_URL=https://your-api-id.execute-api.region.amazonaws.com
```

The frontend will then request `${VITE_EOD_PROXY_URL}/eod/{symbol}` instead of calling `https://eodhd.com` directly.

## Run locally
1. Clone this repository
2. Run `npm run dev`
3. Profit
