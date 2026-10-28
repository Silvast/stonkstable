import React, { useState } from 'react'
import {
    Box,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import dayjs from 'dayjs'
import Panel from '../common/Panel'
import { useTrades } from '../../context/TradesContext'
import { Trade, daysBetween, formatMoney, formatPercent, formatSignedMoney, isEuro, realisedPnl, realisedPct } from '../../utils/trades'
import { mono, tokens } from '../../theme'

interface ClosedTradesProps {
    onEdit: (trade: Trade) => void;
    onDelete: (trade: Trade) => void;
    onReopen: (trade: Trade) => void;
}

const Held = ({ trade }: { trade: Trade }) => {
    if (!trade.close) return null;
    const days = daysBetween(trade.open.date, trade.close.date);

    return (
        <Typography variant="caption" sx={{ color: tokens.textSecondary, whiteSpace: 'nowrap' }}>
            {`${dayjs(trade.open.date).format('D MMM')} → ${dayjs(trade.close.date).format('D MMM')}, ${days} d`}
        </Typography>
    );
};

const Pnl = ({ trade }: { trade: Trade }) => {
    const pnl = realisedPnl(trade);

    return (
        <Box sx={{ ...mono, color: pnl > 0 ? tokens.up : pnl < 0 ? tokens.down : tokens.text }}>
            <Box component="span">{formatSignedMoney(pnl, trade.currency)}</Box>
            <Box component="span" sx={{ fontSize: 12 }}>{formatPercent(realisedPct(trade))}</Box>
        </Box>
    );
};

const ClosedTrades = ({ onEdit, onDelete, onReopen }: ClosedTradesProps): React.ReactElement => {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
    const { closed } = useTrades();

    const euroTrades = closed.filter(isEuro);
    const total = euroTrades.reduce((sum, trade) => sum + realisedPnl(trade), 0);

    return (
        <Panel aria-labelledby="closed-trades-heading" sx={{ overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, px: 2.5, pt: 2, pb: 1.5 }}>
                <Typography id="closed-trades-heading" variant="h2">Closed trades</Typography>
                <Typography variant="caption" color="text.secondary">{`${closed.length}`}</Typography>
            </Box>

            {closed.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, pb: 2.5 }}>
                    No closed trades yet. Closing a position brings it here with its result.
                </Typography>
            ) : isNarrow ? (
                <Stack spacing={1.25} sx={{ px: 2.5, pb: 2.5 }}>
                    {closed.map(trade => (
                        <Box key={trade.id} sx={{ border: `1px solid ${tokens.border}`, borderRadius: '10px', p: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                <Typography sx={{ fontWeight: 500, minWidth: 0 }}>{trade.instrument}</Typography>
                                <Pnl trade={trade} />
                            </Box>
                            <Typography variant="caption" sx={{ ...mono, color: tokens.textSecondary }}>
                                {`${trade.quantity} × ${trade.open.price.toFixed(2)} → ${trade.close?.price.toFixed(2)}`}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                                <Held trade={trade} />
                                <Box sx={{ ml: 'auto' }}>
                                    <ClosedMenu trade={trade} onEdit={onEdit} onDelete={onDelete} onReopen={onReopen} />
                                </Box>
                            </Box>
                        </Box>
                    ))}
                </Stack>
            ) : (
                <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table
                        size="small"
                        aria-label="Closed trades"
                        sx={{
                            '& .MuiTableCell-root': { borderBottom: `1px solid ${tokens.rowLine}`, px: 1.25, py: 0.75 },
                            '& .MuiTableCell-head': {
                                bgcolor: tokens.tableHeader,
                                borderBottom: `1px solid ${tokens.border}`,
                                fontSize: 12,
                                fontWeight: 600,
                                color: tokens.textSecondary,
                                whiteSpace: 'nowrap',
                            },
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Instrument</TableCell>
                                <TableCell align="right">Qty</TableCell>
                                <TableCell align="right">Buy</TableCell>
                                <TableCell align="right">Sell</TableCell>
                                <TableCell>Held</TableCell>
                                <TableCell align="right">Commission</TableCell>
                                <TableCell align="right">P&amp;L</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {closed.map(trade => (
                                <TableRow key={trade.id}>
                                    <TableCell sx={{ fontWeight: 500, minWidth: 180 }}>{trade.instrument}</TableCell>
                                    <TableCell align="right" sx={mono}>{trade.quantity}</TableCell>
                                    <TableCell align="right" sx={mono}>{trade.open.price.toFixed(2)}</TableCell>
                                    <TableCell align="right" sx={mono}>{trade.close?.price.toFixed(2)}</TableCell>
                                    <TableCell><Held trade={trade} /></TableCell>
                                    <TableCell align="right" sx={mono}>
                                        {formatMoney(trade.open.commission + (trade.close?.commission ?? 0), trade.currency)}
                                    </TableCell>
                                    <TableCell align="right"><Pnl trade={trade} /></TableCell>
                                    <TableCell align="right">
                                        <ClosedMenu trade={trade} onEdit={onEdit} onDelete={onDelete} onReopen={onReopen} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        {euroTrades.length > 0 && (
                            <TableFooter>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>{`${euroTrades.length} closed`}</TableCell>
                                    <TableCell />
                                    <TableCell />
                                    <TableCell />
                                    <TableCell />
                                    <TableCell />
                                    <TableCell align="right" sx={{ ...mono, fontWeight: 600, color: total > 0 ? tokens.up : total < 0 ? tokens.down : tokens.text }}>
                                        {formatSignedMoney(total)}
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </TableContainer>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 2.5, py: 1.5 }}>
                Commission is included in every P&amp;L figure.
            </Typography>
        </Panel>
    )
}

interface ClosedMenuProps {
    trade: Trade;
    onEdit: (trade: Trade) => void;
    onDelete: (trade: Trade) => void;
    onReopen: (trade: Trade) => void;
}

const ClosedMenu = ({ trade, onEdit, onDelete, onReopen }: ClosedMenuProps) => {
    const [anchor, setAnchor] = useState<null | HTMLElement>(null);

    return (
        <>
            <IconButton aria-label={`More actions for ${trade.instrument}`} onClick={event => setAnchor(event.currentTarget)} sx={{ width: 36, height: 36 }}>
                <MoreHorizIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                <MenuItem onClick={() => { setAnchor(null); onReopen(trade); }} sx={{ fontSize: 14 }}>Reopen</MenuItem>
                <MenuItem onClick={() => { setAnchor(null); onEdit(trade); }} sx={{ fontSize: 14 }}>Edit</MenuItem>
                <MenuItem onClick={() => { setAnchor(null); onDelete(trade); }} sx={{ fontSize: 14 }}>Delete</MenuItem>
            </Menu>
        </>
    )
}

export default ClosedTrades