import React, { useEffect, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { useTrades } from '../../context/TradesContext'
import { Trade } from '../../utils/trades'
import { parseFinnishNumber } from '../../utils/nordnetParser'

interface EditTradeDialogProps {
    trade: Trade | null
    onClose: () => void
}

const EditTradeDialog = ({ trade, onClose }: EditTradeDialogProps): React.ReactElement => {
    const { updateTrade } = useTrades();
    const [instrument, setInstrument] = useState('');
    const [quantity, setQuantity] = useState('');
    const [buyPrice, setBuyPrice] = useState('');
    const [buyCommission, setBuyCommission] = useState('');
    const [buyDate, setBuyDate] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [sellCommission, setSellCommission] = useState('');
    const [sellDate, setSellDate] = useState('');

    useEffect(() => {
        if (!trade) return
        setInstrument(trade.instrument);
        setQuantity(`${trade.quantity}`);
        setBuyPrice(`${trade.open.price}`);
        setBuyCommission(`${trade.open.commission}`);
        setBuyDate(trade.open.date);
        setSellPrice(trade.close ? `${trade.close.price}` : '');
        setSellCommission(trade.close ? `${trade.close.commission}` : '');
        setSellDate(trade.close ? trade.close.date : '');
    }, [trade]);

    const numbers = {
        quantity: parseFinnishNumber(quantity),
        buyPrice: parseFinnishNumber(buyPrice),
        sellPrice: parseFinnishNumber(sellPrice),
    };

    const valid = instrument.trim() !== '' &&
        numbers.quantity !== null && numbers.quantity > 0 &&
        numbers.buyPrice !== null && numbers.buyPrice > 0 &&
        buyDate !== '' &&
        (!trade?.close || (numbers.sellPrice !== null && numbers.sellPrice > 0 && sellDate !== ''));

    const save = () => {
        if (!trade || !valid || numbers.quantity === null || numbers.buyPrice === null) return
        updateTrade(trade.id, {
            instrument: instrument.trim(),
            quantity: numbers.quantity,
            open: {
                price: numbers.buyPrice,
                commission: parseFinnishNumber(buyCommission) ?? 0,
                date: buyDate,
            },
            ...(trade.close && numbers.sellPrice !== null
                ? {
                    close: {
                        price: numbers.sellPrice,
                        commission: parseFinnishNumber(sellCommission) ?? 0,
                        date: sellDate,
                    },
                }
                : {}),
        });
        onClose();
    };

    return (
        <Dialog open={trade !== null} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Edit trade</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 0.5 }}>
                    <TextField label="Instrument" value={instrument} onChange={event => setInstrument(event.target.value)} autoFocus />
                    <TextField
                        label="Quantity"
                        value={quantity}
                        onChange={event => setQuantity(event.target.value)}
                        inputProps={{ inputMode: 'numeric' }}
                    />
                    <TextField
                        label="Buy price per unit"
                        value={buyPrice}
                        onChange={event => setBuyPrice(event.target.value)}
                        inputProps={{ inputMode: 'decimal' }}
                    />
                    <TextField
                        label="Buy commission"
                        value={buyCommission}
                        onChange={event => setBuyCommission(event.target.value)}
                        inputProps={{ inputMode: 'decimal' }}
                    />
                    <TextField
                        label="Opened on"
                        type="date"
                        value={buyDate}
                        onChange={event => setBuyDate(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                    {trade?.close && (
                        <>
                            <TextField
                                label="Sell price per unit"
                                value={sellPrice}
                                onChange={event => setSellPrice(event.target.value)}
                                inputProps={{ inputMode: 'decimal' }}
                            />
                            <TextField
                                label="Sell commission"
                                value={sellCommission}
                                onChange={event => setSellCommission(event.target.value)}
                                inputProps={{ inputMode: 'decimal' }}
                            />
                            <TextField
                                label="Sold on"
                                type="date"
                                value={sellDate}
                                onChange={event => setSellDate(event.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={save} disabled={!valid}>Save</Button>
            </DialogActions>
        </Dialog>
    )
}

export default EditTradeDialog