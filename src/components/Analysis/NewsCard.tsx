import { Alert, Box, Typography } from '@mui/material';
import dayjs from 'dayjs';
import AnalysisCard from './AnalysisCard';
import { ToneChip, Tone } from '../common/Chips';
import { AnalysisResult, ANALYSIS_THRESHOLDS } from '../../utils/analysis';
import { NewsArticle } from '../../utils/news';
import { tokens } from '../../theme';

const MAX_ARTICLES = 5;

const TONE_LABELS: Record<Tone, string> = { up: 'Positive', down: 'Negative', neutral: 'Neutral' };

const toneOfArticle = (article: NewsArticle): Tone => {
  const polarity = article.sentiment?.polarity;
  if (polarity !== undefined && polarity >= ANALYSIS_THRESHOLDS.newsPositive) return 'up';
  if (polarity !== undefined && polarity <= ANALYSIS_THRESHOLDS.newsNegative) return 'down';
  return 'neutral';
};

const NewsCard = ({ news }: { news: AnalysisResult['news'] }) => {
  const shown = news.error ? [] : news.articles.slice(0, MAX_ARTICLES);
  const tones = shown.map(toneOfArticle);
  const counts = shown.length
    ? `${tones.filter(tone => tone === 'up').length} positive · ${tones.filter(tone => tone === 'down').length} negative`
    : null;

  const renderBody = () => {
    if (news.error) return <Alert severity="warning">{news.error}</Alert>;
    if (shown.length === 0) {
      return <Typography variant="body1" color="text.secondary">No news in the last 72 h</Typography>;
    }
    return shown.map((article, index) => (
      <Box
        component="a"
        key={article.link}
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: 'flex',
          gap: 1.25,
          alignItems: 'flex-start',
          py: 1.25,
          borderBottom: `1px solid ${tokens.rowLine}`,
          color: tokens.text,
          textDecoration: 'none',
          '&:hover .headline': { color: tokens.primaryDark },
        }}
      >
        <ToneChip tone={tones[index]} sx={{ mt: '2px', fontSize: 11, px: 0.75, py: '1px', borderRadius: '5px' }}>
          {TONE_LABELS[tones[index]]}
        </ToneChip>
        <Box component="span" sx={{ flex: 1 }}>
          <Box component="span" className="headline" sx={{ display: 'block', fontWeight: 500 }}>{article.title}</Box>
          <Box component="span" sx={{ fontSize: 12, color: tokens.textSecondary }}>{dayjs(article.date).format('ddd D MMM, HH:mm')}</Box>
        </Box>
      </Box>
    ));
  };

  return (
    <AnalysisCard
      title="News, last 3 days"
      action={counts && <Typography component="span" variant="caption" color="text.secondary">{counts}</Typography>}
    >
      {renderBody()}
    </AnalysisCard>
  );
};

export default NewsCard;
