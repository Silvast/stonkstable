import { Alert, Box, Link, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import AnalysisCard from './AnalysisCard';
import { AnalysisResult, ANALYSIS_THRESHOLDS } from '../../utils/analysis';
import { NewsArticle } from '../../utils/news';

dayjs.extend(relativeTime);

const MAX_ARTICLES = 5;

const sentimentOf = (article: NewsArticle) => {
  const polarity = article.sentiment?.polarity;
  if (polarity !== undefined && polarity >= ANALYSIS_THRESHOLDS.newsPositive) {
    return { label: 'Positive sentiment', color: 'success.main' };
  }
  if (polarity !== undefined && polarity <= ANALYSIS_THRESHOLDS.newsNegative) {
    return { label: 'Negative sentiment', color: 'error.main' };
  }
  return { label: 'Neutral sentiment', color: 'grey.400' };
};

const NewsCard = ({ news }: { news: AnalysisResult['news'] }) => {
  const renderBody = () => {
    if (news.error) return <Alert severity="warning">{news.error}</Alert>;
    if (news.articles.length === 0) {
      return <Typography variant="body2" color="text.secondary">No news in the last 72 h</Typography>;
    }
    return (
      <Stack spacing={1}>
        {news.tone && <Typography variant="body2" color="text.secondary">{`Tone: ${news.tone}`}</Typography>}
        {news.articles.slice(0, MAX_ARTICLES).map(article => {
          const sentiment = sentimentOf(article);
          return (
            <Stack key={article.link} direction="row" spacing={1} alignItems="baseline">
              <Box
                role="img"
                aria-label={sentiment.label}
                sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: sentiment.color, flexShrink: 0 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80, flexShrink: 0 }}>
                {dayjs(article.date).fromNow()}
              </Typography>
              <Link href={article.link} target="_blank" rel="noopener noreferrer" variant="body2">
                {article.title}
              </Link>
            </Stack>
          );
        })}
      </Stack>
    );
  };

  return <AnalysisCard title="News">{renderBody()}</AnalysisCard>;
};

export default NewsCard;
