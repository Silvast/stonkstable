# Stock tables
## General
This is an extremely simple way of showing historical values of stocks. There are multiple excellent services that present stock data as graphs, but I couldn't find any that show tables with change % of historical data. When shorting, I find it usefull to look at an individual stock and their change % over a month or so. 

## API Key
This app does not have a backend (cause I'm lazy), so you need to give your own eodhd.com api key in the form. Since you do not always want to paste your key, you can also use url that has apikey as query param, e.g.  `https://stonks.ansku.fail/?apikey=1234`
You can obtain your own apikey (it does cost though) from [eohd.com](https://eodhd.com/pricing).

## Run locally
1. Clone this repository
2. Run `npm run dev`
3. Profit