import React, { useState } from 'react'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import dayjs from 'dayjs'
import Panel from '../common/Panel'
import { useTrades } from '../../context/TradesContext'
import { formatMoney, formatPercent, formatSignedMoney, summary } from '../../utils/trades'
import { mono, tokens } from '../../theme'

interface GoalPanelProps {
    onEditGoal: () => void
}

const KpiTile = ({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) => (
    <Box sx={{ px: 2, py: 1.75, border: `1px solid ${tokens.border}`, borderRadius: '12px' }}>
        <Typography variant="caption" component="div" color="text.secondary">{label}</Typography>
        <Box sx={{ ...mono, mt: 0.5, fontSize: 20, fontWeight: 500, color: tone === 'up' ? tokens.up : tone === 'down' ? tokens.down : tokens.text }}>
            {value}
        </Box>
    </Box>
)

const clampPercent = (value: number) => Math.min(100, Math.max(0, value))

const GoalProgressBar = ({ realised, projected, amount }: { realised: number; projected: number; amount: number }) => {
    const done = clampPercent((realised / amount) * 100)
    const withProjection = clampPercent((projected / amount) * 100)
    const forecast = Math.max(0, withProjection - done)

    return (
        <Box
            role="progressbar"
            aria-label="Realised profit towards the goal"
            aria-valuenow={Math.round(done)}
            aria-valuemin={0}
            aria-valuemax={100}
            sx={{ position: 'relative', height: 10, borderRadius: 5, bgcolor: tokens.neutralChip, overflow: 'hidden' }}
        >
            {realised > 0 && <Box sx={{ position: 'absolute', inset: '0 auto 0 0', width: `${done}%`, bgcolor: tokens.up }} />}
            {forecast > 0 && (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: '0 auto 0 0',
                        left: `${done}%`,
                        width: `${forecast}%`,
                        backgroundImage: 'repeating-linear-gradient(135deg, #BFE3CF 0 6px, #E3F3EA 6px 12px)',
                    }}
                />
            )}
            <Box sx={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 2, bgcolor: tokens.textIdle }} />
        </Box>
    )
}

const GoalPanel = ({ onEditGoal }: GoalPanelProps): React.ReactElement => {
    const { trades, goal, setGoal } = useTrades()
    const [amount, setAmount] = useState('')
    const totals = summary(trades, goal)

    if (!goal) {
        return (
            <Panel sx={{ p: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 1.5 }}>
                <Box>
                    <Typography variant="h2">Set a goal</Typography>
                    <Typography variant="body2" color="text.secondary">How much do you want to make with these trades?</Typography>
                </Box>
                <Box component="form" onSubmit={event => {
                    event.preventDefault()
                    const value = Number(amount.replace(',', '.'))
                    if (!Number.isFinite(value) || value <= 0) return
                    setGoal({ amount: value, currency: 'EUR' })
                }} sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.25 }}>
                    <TextField
                        label="Goal amount"
                        value={amount}
                        onChange={event => setAmount(event.target.value)}
                        inputProps={{ inputMode: 'decimal' }}
                        sx={{ width: 160 }}
                    />
                    <Button type="submit" variant="contained">Save goal</Button>
                </Box>
            </Panel>
        )
    }

    const share = (totals.realised / goal.amount) * 100
    const goalTitle = goal.label ?? `Make ${formatMoney(goal.amount)}`
    const forecast = totals.projected > totals.realised

    return (
        <Panel sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Box>
                    <Typography sx={{ fontWeight: 600 }}>{goalTitle}</Typography>
                    {goal.since && (
                        <Typography variant="caption" component="div" color="text.secondary">
                            {`since ${dayjs(goal.since).format('D MMM YYYY')}`}
                        </Typography>
                    )}
                </Box>
                <Button size="small" onClick={onEditGoal}>Edit goal</Button>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1 }}>
                <Box
                    component="span"
                    sx={{ ...mono, fontSize: 30, fontWeight: 500, color: totals.realised > 0 ? tokens.up : totals.realised < 0 ? tokens.down : tokens.text }}
                >
                    {formatSignedMoney(totals.realised)}
                </Box>
                <Typography variant="body2" color="text.secondary">{`of ${formatMoney(goal.amount)} · ${formatPercent(share / 100)}`}</Typography>
            </Box>

            <GoalProgressBar realised={totals.realised} projected={totals.projected} amount={goal.amount} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fit, minmax(160px, 1fr))' }, gap: 1.5 }}>
                <KpiTile label="Realised" value={formatSignedMoney(totals.realised)} tone={totals.realised > 0 ? 'up' : totals.realised < 0 ? 'down' : undefined} />
                <KpiTile
                    label="Open P&L"
                    value={totals.openPnl === 0 && !trades.some(trade => !trade.close && trade.priceNow) ? '—' : formatSignedMoney(totals.openPnl)}
                    tone={totals.openPnl > 0 ? 'up' : totals.openPnl < 0 ? 'down' : undefined}
                />
                <KpiTile label="Win rate" value={totals.closedCount === 0 ? '—' : `${totals.wins} of ${totals.closedCount}`} />
                <KpiTile label="Closed trades" value={`${totals.closedCount}`} />
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {forecast && (
                    <Typography variant="caption" color="text.secondary">
                        {`Open positions would take this to ${formatSignedMoney(totals.projected)}, before selling commission.`}
                    </Typography>
                )}
                {totals.excludedCurrencies.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                        {`${totals.excludedCurrencies.join(', ')} trades are left out of these totals.`}
                    </Typography>
                )}
            </Stack>
        </Panel>
    )
}

export { GoalProgressBar }
export default GoalPanel