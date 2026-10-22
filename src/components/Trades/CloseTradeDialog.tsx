import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { useTrades } from '../../context/TradesContext'
import { Trade, formatMoney, formatSignedMoney, summary, todayIso } from '../../utils/trades'
import { parseFinnishNumber } from '../../utils/nordnetParser'
import { mono, tokens } from '../../theme'

interface CloseTradeDialogProps {
    trade: Trade | null
    onClose: () => void
}

const CloseTradeDialog = ({ trade, onClose }: CloseTradeDialogProps): React.ReactElement => {
    const { closeTrade, trades, goal } = useTrades();
    const [price, setPrice] = useState('');
    const [date, setDate] = useState(todayIso);
    const [quantity, setQuantity] = useState('');
    const [commission, setCommission] = useState('');

    useEffect(() => {
        if (!trade) return
        setPrice(trade.priceNow ? `${trade.priceNow}` : '');
        setDate(todayIso());
        setQuantity(`${trade.quantity}`);
        setCommission(`${trade.open.commission}`);
    }, [trade]);

    const numbers = useMemo(() => ({
        price: parseFinnishNumber(price),
        quantity: parseFinnishNumber(quantity),
        commission: parseFinnishNumber(commission) ?? 0,
    }), [price, quantity, commission]);

    const held = trade?.quantity ?? 0;
    const openShare = trade ? (trade.open.commission * (numbers.quantity ?? 0)) / held : 0;
    const proceeds = trade && numbers.price !== null && numbers.quantity !== null
        ? numbers.quantity * numbers.price - numbers.commission
        : null;
    const cost = trade && numbers.quantity !== null ? numbers.quantity * trade.open.price + openShare : null;
    const pnl = proceeds !== null && cost !== null ? proceeds - cost : null;

    const problem = !trade
        ? null
        : numbers.price === null || numbers.price <= 0
            ? 'Enter the price you sold at'
            : numbers.quantity === null || numbers.quantity <= 0 || numbers.quantity > held
                ? `Enter a quantity between 1 and ${held}`
                : date < trade.open.date
                    ? `The sell date is before ${trade.open.date}`
                    : null;

    const totals = summary(trades, goal);
    const after = pnl !== null ? totals.realised + pnl : null;

    const confirm = () => {
        if (!trade || problem || numbers.price === null || numbers.quantity === null) return;
        closeTrade(trade.id, { price: numbers.price, commission: Math.max(0, numbers.commission), date }, numbers.quantity);
        onClose();
    };

    return (
        <Dialog open={trade !== null} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ ...mono, fontSize: 18 }}>{`Close ${trade?.instrument ?? ''}`}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 0.5 }}>
                    <TextField
                        label="Sell price per unit"
                        value={price}
                        onChange={event => setPrice(event.target.value)}
                        inputProps={{ inputMode: 'decimal' }}
                        error={Boolean(price) && (numbers.price === null || numbers.price <= 0)}
                        autoFocus
                    />
                    <TextField
                        label="Sold on"
                        type="date"
                        value={date}
                        onChange={event => setDate(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="Quantity"
                        value={quantity}
                        onChange={event => setQuantity(event.target.value)}
                        inputProps={{ inputMode: 'numeric' }}
                        helperText={`${held} held`}
                        error={Boolean(quantity) && (numbers.quantity === null || numbers.quantity <= 0 || numbers.quantity > held)}
                    />
                    <TextField
                        label="Commission"
                        value={commission}
                        onChange={event => setCommission(event.target.value)}
                        inputProps={{ inputMode: 'decimal' }}
                    />

                    {problem ? (
                        <Typography variant="body2" color="error">{problem}</Typography>
                    ) : (
                        <Box sx={{ p: 1.75, borderRadius: '10px', bgcolor: tokens.neutralChip }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                <Typography variant="body2" color="text.secondary">Proceeds</Typography>
                                <Typography variant="body2" sx={mono}>{formatMoney(proceeds ?? 0, trade?.currency)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                <Typography variant="body2" color="text.secondary">Cost</Typography>
                                <Typography variant="body2" sx={mono}>{formatMoney(cost ?? 0, trade?.currency)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 0.75 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>Profit</Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ ...mono, fontSize: 18, fontWeight: 500, color: (pnl ?? 0) > 0 ? tokens.up : (pnl ?? 0) < 0 ? tokens.down : tokens.text }}
                                >
                                    {formatSignedMoney(pnl ?? 0, trade?.currency)}
                                </Typography>
                            </Box>
                            {goal && after !== null && (
                                <Typography variant="caption" component="div" sx={{ mt: 0.75, color: tokens.textSecondary }}>
                                    {`Goal: ${formatSignedMoney(totals.realised)} → ${formatSignedMoney(after)} of ${formatMoney(goal.amount)}`}
                                </Typography>
                            )}
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={confirm} disabled={Boolean(problem)}>Close position</Button>
            </DialogActions>
        </Dialog>
    )
}

export default CloseTradeDialog