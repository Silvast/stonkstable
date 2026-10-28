import React, { useMemo, useState } from 'react'
import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'
import Panel from '../common/Panel'
import SegmentedControl from '../common/SegmentedControl'
import { useTrades } from '../../context/TradesContext'
import { ProgressPoint, formatMoney, progressSeries } from '../../utils/trades'
import { tokens } from '../../theme'

type Range = '1M' | '3M' | 'All';

const RANGES: readonly Range[] = ['1M', '3M', 'All'];
const MONTHS: Record<Exclude<Range, 'All'>, number> = { '1M': 1, '3M': 3 };

const CHART = { width: 960, height: 240, left: 64, right: 120, top: 16, bottom: 200 } as const;

interface Chart {
    line: string;
    dots: { x: number; y: number; up: boolean }[];
    grid: { y: number; label: string }[];
    dates: { x: number; label: string }[];
    goalY?: number;
    description: string;
}

const buildChart = (points: ProgressPoint[], goalAmount: number | null): Chart => {
    const values = points.map(point => point.cumulative);
    if (goalAmount !== null) values.push(goalAmount);
    const low = Math.min(0, ...values);
    const high = Math.max(0, ...values);
    const span = high - low || Math.abs(high) || 1;
    const from = low - span * 0.1;
    const to = high + span * 0.1;

    const plotWidth = CHART.width - CHART.left - CHART.right;
    const plotHeight = CHART.bottom - CHART.top;
    const first = dayjs(points[0].date).valueOf();
    const last = dayjs(points[points.length - 1].date).valueOf();
    const timeSpan = last - first || 1;

    const xAt = (date: string) => CHART.left + ((dayjs(date).valueOf() - first) / timeSpan) * plotWidth;
    const yAt = (value: number) => CHART.top + ((to - value) / (to - from)) * plotHeight;

    let line = `M${xAt(points[0].date).toFixed(1)} ${yAt(points[0].cumulative).toFixed(1)}`;
    points.forEach((point, index) => {
        if (index === 0) return;
        const x = xAt(point.date).toFixed(1);
        line += ` L${x} ${yAt(points[index - 1].cumulative).toFixed(1)} L${x} ${yAt(point.cumulative).toFixed(1)}`;
    });

    const grid = Array.from({ length: 4 }, (_, index) => {
        const value = from + ((to - from) / 3) * index;
        return { y: yAt(value), label: formatMoney(value) };
    });

    const labelAt = [0, Math.floor((points.length - 1) / 2), points.length - 1];

    return {
        line,
        dots: points.map(point => ({ x: xAt(point.date), y: yAt(point.cumulative), up: point.pnl > 0 })),
        grid,
        dates: labelAt.map(index => ({ x: xAt(points[index].date), label: dayjs(points[index].date).format('D MMM') })),
        goalY: goalAmount === null ? undefined : yAt(goalAmount),
        description: `Realised profit from ${formatMoney(points[0].cumulative)} to ${formatMoney(points[points.length - 1].cumulative)} over ${points.length} closed trades`,
    };
};

const ProgressChart = (): React.ReactElement => {
    const { trades, goal } = useTrades();
    const [range, setRange] = useState<Range>('All');

    const all = useMemo(() => progressSeries(trades, goal), [trades, goal]);

    const points = useMemo(() => {
        if (range === 'All') return all;
        const from = dayjs().subtract(MONTHS[range], 'month').startOf('day');
        return all.filter(point => !dayjs(point.date).isBefore(from));
    }, [all, range]);

    const chart = points.length >= 2 ? buildChart(points, goal?.amount ?? null) : null;

    return (
        <Panel sx={{ px: 2.5, py: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="h2">Progress</Typography>
                <SegmentedControl label="Range" options={RANGES} value={range} onChange={setRange} />
            </Box>

            {!chart ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {all.length < 2
                        ? 'Close two trades to see how your realised profit builds up here.'
                        : 'Not enough closed trades in this range. Try All.'}
                </Typography>
            ) : (
                <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} width="100%" role="img" aria-label={chart.description} style={{ display: 'block' }}>
                    {chart.grid.map(line => (
                        <g key={line.label}>
                            <line x1={CHART.left - 8} x2={CHART.width - CHART.right} y1={line.y} y2={line.y} stroke={tokens.neutralChip} />
                            <text x={CHART.left - 16} y={line.y + 4} textAnchor="end" fontSize="11" fill={tokens.textSecondary} fontFamily={tokens.fontMono}>
                                {line.label}
                            </text>
                        </g>
                    ))}
                    {chart.goalY !== undefined && (
                        <g>
                            <line
                                x1={CHART.left - 8}
                                x2={CHART.width - CHART.right}
                                y1={chart.goalY}
                                y2={chart.goalY}
                                stroke={tokens.textSecondary}
                                strokeDasharray="6 5"
                            />
                            <text
                                x={CHART.width - CHART.right + 8}
                                y={chart.goalY + 4}
                                fontSize="11"
                                fill={tokens.textSecondary}
                                fontFamily={tokens.fontSans}
                            >
                                {`Goal ${formatMoney(goal?.amount ?? 0)}`}
                            </text>
                        </g>
                    )}
                    <path d={chart.line} fill="none" stroke={tokens.primary} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
                    {chart.dots.map((dot, index) => (
                        <circle key={`${index}-${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r="4" fill={dot.up ? tokens.up : tokens.down} />
                    ))}
                    {chart.dates.map((date, index) => (
                        <text key={`${date.label}-${index}`} x={date.x} y={CHART.bottom + 24} textAnchor="middle" fontSize="11" fill={tokens.textSecondary} fontFamily={tokens.fontSans}>
                            {date.label}
                        </text>
                    ))}
                </svg>
            )}
        </Panel>
    )
}

export default ProgressChart