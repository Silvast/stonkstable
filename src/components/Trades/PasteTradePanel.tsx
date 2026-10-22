import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Link, Stack, TextField, Typography } from '@mui/material'
import dayjs from 'dayjs'
import Panel from '../common/Panel'
import { ToneChip } from '../common/Chips'
import { useTrades } from '../../context/TradesContext'
import { ParsedOrder, parseNordnetOrder } from '../../utils/nordnetParser'
import { formatMoney, todayIso } from '../../utils/trades'
import { mono, tokens } from '../../theme'

interface PasteTradePanelProps {
    /** changing this scrolls to the paste box and focuses it */
    focusSignal?: number;
    onSaved: (message: string, undo?: () => void) => void;
}

interface Draft {
    instrument: string;
    quantity: string;
    price: string;
    commission: string;
    date: string;
    currency: string;
    instrumentUrl?: string;
    account?: string;
}

const emptyDraft = (): Draft => ({
    instrument: '',
    quantity: '',
    price: '',
    commission: '',
    date: todayIso(),
    currency: 'EUR',
});

const draftFrom = (order: Partial<ParsedOrder>): Draft => ({
    instrument: order.instrument ?? '',
    quantity: order.quantity !== undefined ? `${order.quantity}` : '',
    price: order.price !== undefined ? `${order.price}` : '',
    commission: order.commission !== undefined ? `${order.commission}` : '',
    date: todayIso(),
    currency: order.currency ?? 'EUR',
    ...(order.instrumentUrl ? { instrumentUrl: order.instrumentUrl } : {}),
    ...(order.account ? { account: order.account } : {}),
});

const toNumber = (text: string): number | null => {
    const value = Number(text.replace(',', '.').trim());
    return Number.isFinite(value) ? value : null;
};

const PasteTradePanel = ({ focusSignal, onSaved }: PasteTradePanelProps): React.ReactElement => {
    const { addTrade, closeTrade, findOpenMatch, removeTrade } = useTrades();
    const [text, setText] = useState('');
    const [draft, setDraft] = useState<Draft>(emptyDraft);
    const [asNewPosition, setAsNewPosition] = useState(false);
    const pasteRef = useRef<HTMLTextAreaElement>(null);

    const parsed = useMemo(() => (text.trim() === '' ? null : parseNordnetOrder(text)), [text]);

    useEffect(() => {
        if (!parsed) return;
        setDraft(parsed.ok ? draftFrom(parsed.order) : draftFrom(parsed.partial));
        setAsNewPosition(false);
    }, [parsed]);

    useEffect(() => {
        if (!focusSignal) return;
        pasteRef.current?.scrollIntoView?.({ block: 'center' });
        pasteRef.current?.focus();
    }, [focusSignal]);

    const match = parsed?.ok ? findOpenMatch(parsed.order) : null;
    const closesPosition = Boolean(match) && parsed?.ok === true && parsed.order.side === 'sell' && !asNewPosition;

    const quantity = toNumber(draft.quantity);
    const price = toNumber(draft.price);
    const commission = toNumber(draft.commission) ?? 0;
    const ready = draft.instrument.trim() !== '' && quantity !== null && quantity > 0 && price !== null && price > 0 && /^\d{4}-\d{2}-\d{2}$/.test(draft.date);

    const set = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setDraft(previous => ({ ...previous, [key]: event.target.value }));
    };

    const clearAll = () => {
        setText('');
        setDraft(emptyDraft());
        setAsNewPosition(false);
    };

    const save = () => {
        if (!ready || quantity === null || price === null) return;
        const leg = { price, commission: Math.max(0, commission), date: draft.date };

        if (closesPosition && match && parsed?.ok) {
            closeTrade(match.id, leg, parsed.order.quantity < match.quantity ? parsed.order.quantity : undefined);
            onSaved(`Closed ${draft.instrument.trim()}`);
        } else {
            const trade = addTrade({
                instrument: draft.instrument.trim(),
                quantity,
                currency: draft.currency,
                open: leg,
                ...(draft.instrumentUrl ? { instrumentUrl: draft.instrumentUrl } : {}),
                ...(draft.account ? { account: draft.account } : {}),
            });
            onSaved(`Saved ${trade.instrument}`, () => removeTrade(trade.id));
        }
        clearAll();
    };

    const missing = parsed && !parsed.ok ? parsed.missing : [];

    return (
        <Panel sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <Box>
                <Typography variant="h2">Add a trade</Typography>
                <Typography variant="body2" color="text.secondary">
                    Copy the confirmation from Nordnet, paste it here and save it as an open position.
                </Typography>
            </Box>

            <TextField
                inputRef={pasteRef}
                label="Paste a Nordnet order confirmation"
                placeholder="Vahvista toimeksianto"
                multiline
                minRows={6}
                value={text}
                onChange={event => setText(event.target.value)}
                sx={{ '& .MuiInputBase-input': { ...mono, fontSize: 13, whiteSpace: 'pre-wrap' } }}
            />

            {parsed?.ok && (
                <Box sx={{ ...mono, fontSize: 13, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                    <ToneChip tone={parsed.order.side === 'buy' ? 'up' : 'down'}>{parsed.order.side === 'buy' ? 'Buy' : 'Sell'}</ToneChip>
                    <span>{`${parsed.order.quantity} × ${formatMoney(parsed.order.price, parsed.order.currency)}`}</span>
                    <span>{parsed.order.instrument}</span>
                    {parsed.order.account && <Box component="span" sx={{ color: tokens.textSecondary }}>{parsed.order.account}</Box>}
                </Box>
            )}

            {parsed?.ok && parsed.warnings.length > 0 && (
                <Typography variant="caption" color="text.secondary">{parsed.warnings.join('. ')}</Typography>
            )}

            {!parsed?.ok && text.trim() !== '' && (
                <Typography variant="body2" color="text.secondary">
                    Couldn't find price and quantity in this text. Fill them in below or paste the whole confirmation.
                </Typography>
            )}

            {closesPosition && match && (
                <Typography variant="body2" color="text.secondary">
                    {`This closes your open position in ${match.instrument} (${match.quantity} bought at ${match.open.price.toFixed(2)} on ${dayjs(match.open.date).format('D MMM')}).`}
                </Typography>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
                <TextField
                    label="Instrument"
                    value={draft.instrument}
                    onChange={set('instrument')}
                    error={missing.includes('instrument')}
                    sx={{ flex: '2 1 240px' }}
                />
                <TextField
                    label="Quantity"
                    value={draft.quantity}
                    onChange={set('quantity')}
                    error={missing.includes('quantity')}
                    inputProps={{ inputMode: 'numeric' }}
                    sx={{ flex: '1 1 120px' }}
                />
                <TextField
                    label="Price per unit"
                    value={draft.price}
                    onChange={set('price')}
                    error={missing.includes('price')}
                    inputProps={{ inputMode: 'decimal' }}
                    sx={{ flex: '1 1 150px' }}
                />
                <TextField
                    label="Commission"
                    value={draft.commission}
                    onChange={set('commission')}
                    inputProps={{ inputMode: 'decimal' }}
                    sx={{ flex: '1 1 130px' }}
                />
                <TextField
                    label={closesPosition ? 'Sold on' : 'Date'}
                    type="date"
                    value={draft.date}
                    onChange={set('date')}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: '1 1 170px' }}
                />
            </Stack>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                <Button variant="contained" onClick={save} disabled={!ready}>{closesPosition ? 'Close position' : 'Save'}</Button>
                <Button onClick={clearAll} disabled={text === '' && draft.instrument === ''}>Clear</Button>
                {closesPosition && (
                    <Link component="button" type="button" underline="hover" onClick={() => setAsNewPosition(true)} sx={{ fontSize: 13 }}>
                        Save as a new open position instead
                    </Link>
                )}
                <Link
                    component="button"
                    type="button"
                    underline="hover"
                    onClick={() => { setText(''); setDraft(emptyDraft()); setAsNewPosition(false); }}
                    sx={{ ml: 'auto', fontSize: 13 }}
                >
                    Enter manually
                </Link>
            </Box>
        </Panel>
    )
}

export default PasteTradePanel