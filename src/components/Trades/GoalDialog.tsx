import React, { useEffect, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { useTrades } from '../../context/TradesContext'
import { TradeGoal, formatMoney } from '../../utils/trades'
import { parseFinnishNumber } from '../../utils/nordnetParser'

interface GoalDialogProps {
    open: boolean
    onClose: () => void
}

const GoalDialog = ({ open, onClose }: GoalDialogProps): React.ReactElement => {
    const { goal, setGoal } = useTrades();
    const [amount, setAmount] = useState('');
    const [since, setSince] = useState('');
    const [label, setLabel] = useState('');

    useEffect(() => {
        if (!open) return
        setAmount(goal ? `${goal.amount}` : '');
        setSince(goal?.since ?? '');
        setLabel(goal?.label ?? '');
    }, [open, goal]);

    const value = parseFinnishNumber(amount);

    const save = () => {
        if (value === null || value <= 0) return
        const next: TradeGoal = { amount: value, currency: 'EUR' };
        if (since) next.since = since;
        if (label.trim()) next.label = label.trim();
        setGoal(next);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Trade goal</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 0.5 }}>
                    <TextField
                        label="Amount (EUR)"
                        value={amount}
                        onChange={event => setAmount(event.target.value)}
                        inputProps={{ inputMode: 'decimal' }}
                        error={Boolean(amount) && (value === null || value <= 0)}
                        helperText={goal ? `Currently ${formatMoney(goal.amount)}` : 'No goal set yet'}
                        autoFocus
                    />
                    <TextField
                        label="Count trades closed since"
                        type="date"
                        value={since}
                        onChange={event => setSince(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        helperText="Leave empty to count every closed trade"
                    />
                    <TextField
                        label="Name"
                        value={label}
                        onChange={event => setLabel(event.target.value)}
                        helperText="For example Autumn 2026"
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between' }}>
                {goal && <Button color="error" onClick={() => { setGoal(null); onClose() }}>Remove goal</Button>}
                <Box />
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={save} disabled={value === null || value <= 0}>Save goal</Button>
            </DialogActions>
        </Dialog>
    )
}

export default GoalDialog