import dayjs from 'dayjs';
import { recordApiCalls } from './apiUsage';

export interface NewsSentiment {
  polarity: number;
  neg: number;
  neu: number;
  pos: number;
}

export interface NewsArticle {
  date: string;
  title: string;
  link: string;
  symbols: string[];
  sentiment?: NewsSentiment;
}

export interface NewsResult {
  data: NewsArticle[];
  error: string | null;
}

const NEWS_ERROR = 'Failed to load news. Please try again later.';

const toArticle = ({ date, title, link, symbols, sentiment }: NewsArticle): NewsArticle =>
  sentiment ? { date, title, link, symbols, sentiment } : { date, title, link, symbols };

export const fetchNewsFromApi = async (
  symbol: string,
  exchange: string,
  apiKey: string,
  from: dayjs.Dayjs
): Promise<NewsResult> => {
  try {
    const token = encodeURIComponent(apiKey.trim() || 'demo');
    const fullSymbol = encodeURIComponent(`${symbol}.${exchange}`);
    const apiUrl = `/api/eodhd/news?s=${fullSymbol}&from=${from.format('YYYY-MM-DD')}&limit=10&offset=0&api_token=${token}&fmt=json`;

    recordApiCalls(5);
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`News request failed with status ${response.status}`);
    }

    const apiData = await response.json();

    if (!Array.isArray(apiData)) {
      throw new Error('News response was not a list of articles');
    }

    const articles = (apiData as NewsArticle[])
      .map(toArticle)
      .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

    return { data: articles, error: null };
  } catch (err) {
    console.error('Error fetching news:', err);
    return { data: [], error: NEWS_ERROR };
  }
};
