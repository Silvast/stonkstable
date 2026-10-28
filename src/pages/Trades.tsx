import React, { useState } from 'react'
import { Box, Button, Snackbar, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useTrades } from '../context/TradesContext'
import { Trade } from '../utils/trades'
import StatusChip from '../components/common/StatusChip'
import {
    CloseTradeDialog,
    ClosedTrades,
    EditTradeDialog,
    GoalDialog,
    GoalPanel,
    OpenPositions,
    PasteTradePanel,
    ProgressChart,
} from '../components/Trades'

interface Toast {
    message: string;
    undo?: () => void;
}

const Trades = (): React.ReactElement => {
    const { removeTrade, reopenTrade, restoreTrade } = useTrades();
    const [goalOpen, setGoalOpen] = useState(false);
    const [closing, setClosing] = useState<Trade | null>(null);
    const [editing, setEditing] = useState<Trade | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);
    const [focusSignal, setFocusSignal] = useState(0);

    const undo = () => {
        toast?.undo?.();
        setToast(null);
    };

    return (
        <Stack spacing={2}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="h1">Trades</Typography>
                    {/* Trades are local only for now: account sync needs an Amplify deploy first. */}
                    <StatusChip synced={false} />
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFocusSignal(signal => signal + 1)}>
                    Add trade
                </Button>
            </Box>

            <GoalPanel onEditGoal={() => setGoalOpen(true)} />
            <PasteTradePanel focusSignal={focusSignal} onSaved={(message, undo) => setToast({ message, undo })} />
            <OpenPositions
                onClose={setClosing}
                onEdit={setEditing}
                onDelete={trade => {
                    removeTrade(trade.id);
                    setToast({ message: `Deleted ${trade.instrument}`, undo: () => restoreTrade(trade) });
                }}
            />
            <ProgressChart />
            <ClosedTrades
                onEdit={setEditing}
                onReopen={trade => {
                    reopenTrade(trade.id);
                    setToast({ message: `Reopened ${trade.instrument}` });
                }}
                onDelete={trade => {
                    removeTrade(trade.id);
                    setToast({ message: `Deleted ${trade.instrument}`, undo: () => restoreTrade(trade) });
                }}
            />

            <GoalDialog open={goalOpen} onClose={() => setGoalOpen(false)} />
            <CloseTradeDialog trade={closing} onClose={() => setClosing(null)} />
            <EditTradeDialog trade={editing} onClose={() => setEditing(null)} />

            <Snackbar
                open={toast !== null}
                autoHideDuration={5000}
                onClose={(_event, reason) => { if (reason !== 'clickaway') setToast(null) }}
                message={toast?.message ?? ''}
                action={toast?.undo ? <Button color="primary" size="small" onClick={undo}>Undo</Button> : undefined}
            />
        </Stack>
    )
}

export default Trades