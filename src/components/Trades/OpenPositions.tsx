import React, { useEffect, useState } from 'react'
import {
    Box,
    Button,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import dayjs from 'dayjs'
import Panel from '../common/Panel'
import { useTrades } from '../../context/TradesContext'
import { Trade, costBasis, formatMoney, formatPercent, formatSignedMoney, openPnl, openPct } from '../../utils/trades'
import { mono, tokens } from '../../theme'

interface OpenPositionsProps {
    onClose: (trade: Trade) => void;
    onEdit: (trade: Trade) => void;
    onDelete: (trade: Trade) => void;
}

const PriceNowInput = ({ trade }: { trade: Trade }) => {
    const { updateTrade } = useTrades();
    const [value, setValue] = useState(trade.priceNow === undefined ? '' : `${trade.priceNow}`);

    useEffect(() => {
        setValue(trade.priceNow === undefined ? '' : `${trade.priceNow}`);
    }, [trade.priceNow]);

    const commit = () => {
        const parsed = Number(value.replace(',', '.').trim());
        if (value.trim() === '') {
            updateTrade(trade.id, { priceNow: undefined });
            return;
        }
        if (Number.isFinite(parsed) && parsed > 0 && parsed !== trade.priceNow) updateTrade(trade.id, { priceNow: parsed });
        else setValue(trade.priceNow === undefined ? '' : `${trade.priceNow}`);
    };

    return (
        <TextFieldNumber
            label={`Price now for ${trade.instrument}`}
            value={value}
            onChange={setValue}
            onCommit={commit}
        />
    );
}

const TextFieldNumber = ({ label, value, onChange, onCommit }: { label: string; value: string; onChange: (value: string) => void; onCommit: () => void }) => (
    <Box
        component="input"
        aria-label={label}
        value={value}
        inputMode="decimal"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') event.currentTarget.blur();
        }}
        sx={{
            ...mono,
            width: 96,
            px: 1,
            py: 0.5,
            fontSize: 13,
            color: tokens.text,
            bgcolor: tokens.panel,
            border: `1px solid ${tokens.inputBorder}`,
            borderRadius: '8px',
            outline: 'none',
            '&:focus': { borderColor: tokens.primary },
        }}
    />
);

const InstrumentCell = ({ trade }: { trade: Trade }) => (
    <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trade.instrument}</Typography>
            {trade.instrumentUrl && (
                <Tooltip title="Open on Nordnet">
                    <IconButton
                        component="a"
                        href={trade.instrumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${trade.instrument} on Nordnet`}
                        size="small"
                        sx={{ width: 28, height: 28 }}
                    >
                        <OpenInNewIcon sx={{ fontSize: 15, color: tokens.textIdle }} />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
        {trade.account && <Typography variant="caption" color="text.secondary">{trade.account}</Typography>}
    </Box>
);

const MoreMenu = ({ label, items }: { label: string; items: { label: string; onClick: () => void }[] }) => {
    const [anchor, setAnchor] = useState<null | HTMLElement>(null);

    return (
        <>
            <IconButton aria-label={label} onClick={event => setAnchor(event.currentTarget)} sx={{ width: 36, height: 36 }}>
                <MoreHorizIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                {items.map(item => (
                    <MenuItem
                        key={item.label}
                        onClick={() => { setAnchor(null); item.onClick(); }}
                        sx={{ fontSize: 14 }}
                    >
                        {item.label}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

const PnlCell = ({ trade }: { trade: Trade }) => {
    const pnl = openPnl(trade);

    if (pnl === null) return <Box component="span" sx={{ color: tokens.textSecondary }}>—</Box>;

    return (
        <Box sx={{ ...mono, color: pnl > 0 ? tokens.up : pnl < 0 ? tokens.down : tokens.text }}>
            <Box component="span">{formatSignedMoney(pnl, trade.currency)}</Box>
            <Box component="span" sx={{ fontSize: 12 }}>{formatPercent(openPct(trade))}</Box>
        </Box>
    );
};

const OpenPositions = ({ onClose, onEdit, onDelete }: OpenPositionsProps): React.ReactElement => {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
    const { open } = useTrades();

    return (
        <Panel aria-labelledby="open-positions-heading" sx={{ overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, px: 2.5, pt: 2, pb: 1.5 }}>
                <Typography id="open-positions-heading" variant="h2">Open positions</Typography>
                <Typography variant="caption" color="text.secondary">{`${open.length}`}</Typography>
            </Box>

            {open.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, pb: 2.5 }}>
                    No open positions. Paste a Nordnet confirmation above to add one.
                </Typography>
            ) : isNarrow ? (
                <Stack spacing={1.25} sx={{ px: 2.5, pb: 2.5 }}>
                    {open.map(trade => (
                        <Box key={trade.id} sx={{ border: `1px solid ${tokens.border}`, borderRadius: '10px', p: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 500 }}>{trade.instrument}</Typography>
                                    {trade.account && <Typography variant="caption" color="text.secondary">{trade.account}</Typography>}
                                </Box>
                                <PnlCell trade={trade} />
                            </Box>
                            <Typography variant="caption" sx={mono}>
                                {`${trade.quantity} × ${trade.open.price.toFixed(2)} → now ${trade.priceNow === undefined ? '—' : trade.priceNow.toFixed(2)}`}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                                <PriceNowInput trade={trade} />
                                <Button size="small" variant="outlined" sx={{ flex: 1 }} onClick={() => onClose(trade)}>Close</Button>
                                <MoreMenu
                                    label={`More actions for ${trade.instrument}`}
                                    items={[
                                        { label: 'Edit', onClick: () => onEdit(trade) },
                                        { label: 'Delete', onClick: () => onDelete(trade) },
                                    ]}
                                />
                            </Box>
                        </Box>
                    ))}
                </Stack>
            ) : (
                <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table
                        size="small"
                        aria-label="Open positions"
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
                                <TableCell align="right">Cost</TableCell>
                                <TableCell align="right">Opened</TableCell>
                                <TableCell align="right">Price now</TableCell>
                                <TableCell align="right">Open P&amp;L</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {open.map(trade => (
                                <TableRow key={trade.id}>
                                    <TableCell sx={{ minWidth: 200 }}><InstrumentCell trade={trade} /></TableCell>
                                    <TableCell align="right" sx={mono}>{trade.quantity}</TableCell>
                                    <TableCell align="right" sx={mono}>{trade.open.price.toFixed(2)}</TableCell>
                                    <TableCell align="right" sx={mono}>{formatMoney(costBasis(trade), trade.currency)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 13, color: tokens.textSecondary, whiteSpace: 'nowrap' }}>
                                        {dayjs(trade.open.date).format('D MMM YYYY')}
                                    </TableCell>
                                    <TableCell align="right"><PriceNowInput trade={trade} /></TableCell>
                                    <TableCell align="right"><PnlCell trade={trade} /></TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                            <Button size="small" variant="outlined" onClick={() => onClose(trade)}>Close</Button>
                                            <MoreMenu
                                                label={`More actions for ${trade.instrument}`}
                                                items={[
                                                    { label: 'Edit', onClick: () => onEdit(trade) },
                                                    { label: 'Delete', onClick: () => onDelete(trade) },
                                                ]}
                                            />
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Panel>
    )
}

export default OpenPositions