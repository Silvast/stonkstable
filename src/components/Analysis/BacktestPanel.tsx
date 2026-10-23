import { Fragment, useId, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { BaselineStat, BiasBacktest, HorizonStat, MIN_SIGNALS } from '../../utils/biasBacktest';
import { DASH, formatPercent } from './format';
import { mono, tokens } from '../../theme';

interface BacktestPanelProps {
  backtest: BiasBacktest;
}

const percent = (rate: number | null): string => (rate === null ? DASH : `${Math.round(rate * 100)}%`);

const HitRate = ({ stat }: { stat: HorizonStat }) => {
  const tooFew = stat.samples < MIN_SIGNALS;
  return (
    <Box component="span" sx={{ display: 'block', ...mono, color: tooFew ? tokens.textSecondary : tokens.text }}>
      {percent(stat.hitRate)}
      {tooFew && (
        <Box component="span" sx={{ display: 'block', fontFamily: 'inherit', fontSize: 11 }}>
          {stat.samples === 0 ? 'no data' : `n=${stat.samples}, too few`}
        </Box>
      )}
    </Box>
  );
};

const BaselineRates = ({ stat }: { stat: BaselineStat }) => (
  <Box component="span" sx={{ display: 'block', ...mono, color: tokens.textSecondary }}>
    {`${percent(stat.upRate)} up`}
    <Box component="span" sx={{ display: 'block', fontSize: 11 }}>{`${percent(stat.downRate)} down`}</Box>
  </Box>
);

const BacktestPanel = ({ backtest }: BacktestPanelProps) => {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  const headingId = useId();

  const directionalRows = backtest.rows.filter(row => row.label !== 'Stand aside');
  const anyTooFew = directionalRows.some(row => backtest.horizons.some(h => row.byHorizon[h].samples < MIN_SIGNALS));

  return (
    <Accordion
      disableGutters
      elevation={0}
      expanded={open}
      onChange={(_, expanded) => setOpen(expanded)}
      sx={{ bgcolor: tokens.panel, border: `1px solid ${tokens.border}`, borderRadius: '12px !important', '&::before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} id={headingId} aria-controls={regionId} sx={{ px: 2.5, minHeight: 52 }}>
        <Typography component="span" sx={{ fontSize: 15, fontWeight: 600 }}>How has this signal done?</Typography>
      </AccordionSummary>
      <AccordionDetails id={regionId} role="region" aria-labelledby={headingId} sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
        {backtest.days === 0 ? (
          <Typography variant="body1" color="text.secondary">
            Not enough history to backtest yet. At least 20 daily bars are needed.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              {`The bias was recalculated for each of the last ${backtest.days} days using only data up to that day (news excluded). `}
              Hit means the price moved in the signalled direction (up for long, down for short). Returns are close to close, in trading days.
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" aria-label="Bias backtest results">
                <TableHead>
                  <TableRow>
                    <TableCell rowSpan={2} sx={{ verticalAlign: 'bottom' }}>Bias</TableCell>
                    <TableCell rowSpan={2} align="right" sx={{ verticalAlign: 'bottom' }}>Signals</TableCell>
                    {backtest.horizons.map(h => (
                      <TableCell key={h} colSpan={2} align="center">{`${h} ${h === 1 ? 'day' : 'days'}`}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    {backtest.horizons.map(h => (
                      <Fragment key={h}>
                        <TableCell align="right">Hit rate</TableCell>
                        <TableCell align="right">Avg return</TableCell>
                      </Fragment>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backtest.rows.map(row => (
                    <TableRow key={row.label}>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{row.label}</TableCell>
                      <TableCell align="right" sx={mono}>{row.signals}</TableCell>
                      {backtest.horizons.map(h => (
                        <Fragment key={h}>
                          <TableCell align="right">
                            {row.label === 'Stand aside' ? DASH : <HitRate stat={row.byHorizon[h]} />}
                          </TableCell>
                          <TableCell align="right" sx={mono}>{formatPercent(row.byHorizon[h].avgReturnPercent)}</TableCell>
                        </Fragment>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ color: tokens.textSecondary, whiteSpace: 'nowrap' }}>All days (base rate)</TableCell>
                    <TableCell align="right" sx={mono}>{backtest.days}</TableCell>
                    {backtest.horizons.map(h => (
                      <Fragment key={h}>
                        <TableCell align="right"><BaselineRates stat={backtest.baseline[h]} /></TableCell>
                        <TableCell align="right" sx={mono}>{formatPercent(backtest.baseline[h].avgReturnPercent)}</TableCell>
                      </Fragment>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
            {anyTooFew ? (
              <Typography variant="body2" sx={{ color: tokens.textIdle, fontWeight: 500 }}>
                {`Too few signals to judge. A hit rate needs at least ${MIN_SIGNALS} signals per horizon; cells marked "too few" are not yet meaningful.`}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Neighbouring days share most of their price moves, so the signals are not independent.
              </Typography>
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default BacktestPanel;
