import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import Panel from '../common/Panel';
import { StockData } from '../../utils/stockTable';
import { buildPriceChart, CHART } from '../../utils/priceChart';
import { tokens } from '../../theme';

const UP_BAR = '#BFE3CF';
const DOWN_BAR = '#F3C9BF';

const PriceChartPanel = ({ rows }: { rows: StockData[] }) => {
  const chart = useMemo(() => buildPriceChart(rows), [rows]);

  return (
    <Panel sx={{ px: 2.5, py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h2">Close and volume</Typography>
        <Typography variant="caption" color="text.secondary">{`${rows.length} trading days`}</Typography>
      </Box>
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        width="100%"
        role="img"
        aria-label={chart.description}
        style={{ display: 'block' }}
      >
        {chart.grid.map(line => (
          <g key={line.label}>
            <line x1={CHART.left - 8} x2={CHART.width - 8} y1={line.y} y2={line.y} stroke={tokens.neutralChip} />
            <text x={CHART.left - 16} y={line.y + 4} textAnchor="end" fontSize="11" fill={tokens.textSecondary} fontFamily={tokens.fontMono}>
              {line.label}
            </text>
          </g>
        ))}
        {chart.bars.map((bar, index) => (
          <rect key={index} x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="2" fill={bar.up ? UP_BAR : DOWN_BAR} />
        ))}
        <path d={chart.line} fill="none" stroke={tokens.primary} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
        {chart.dates.map(date => (
          <text key={date.label} x={date.x} y={CHART.height - 2} textAnchor="middle" fontSize="11" fill={tokens.textSecondary} fontFamily={tokens.fontSans}>
            {date.label}
          </text>
        ))}
      </svg>
    </Panel>
  );
};

export default PriceChartPanel;
