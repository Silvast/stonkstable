import React, { useId, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import Panel from '../common/Panel';
import { COLUMNS, Order, StockData, getComparator, renderCellContent, stableSort } from '../../utils/stockTable';
import { formatRowDate, formatVolume, pricesToCsv } from '../../utils/priceStats';
import { mono, tokens } from '../../theme';

type ColumnId = keyof StockData | 'changePercent' | 'prevDayChangePercent';

const downloadCsv = (rows: StockData[], fileName: string) => {
  const url = URL.createObjectURL(new Blob([pricesToCsv(rows)], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

interface PricesTableProps {
  rows: StockData[];
  code: string;
}

const PricesTable = ({ rows, code }: PricesTableProps) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<ColumnId>('date');
  const [fullScreen, setFullScreen] = useState(false);
  const dialogTitleId = useId();

  const breakpoint = isXs ? 'xs' : isSm ? 'sm' : 'md';
  const columns = fullScreen ? COLUMNS : COLUMNS.filter(column => column.responsiveVisibility?.[breakpoint] ?? true);

  const sortedRows = useMemo(
    () => stableSort(rows, getComparator(order, orderBy, rows)),
    [rows, order, orderBy]
  );

  const handleSort = (property: ColumnId) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const cellContent = (row: StockData, column: typeof COLUMNS[number]): React.ReactNode => {
    if (column.id === 'date') return formatRowDate(row.date);
    if (column.id === 'volume') return formatVolume(row.volume);
    return renderCellContent(row, column, rows);
  };

  const renderHeader = (inDialog: boolean) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, borderBottom: `1px solid ${tokens.border}` }}>
      <Typography variant="h2" id={inDialog ? dialogTitleId : undefined}>
        {inDialog ? `Daily prices for ${code}` : 'Daily prices'}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="outlined"
          size="small"
          startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
          onClick={() => downloadCsv(rows, `${code}-prices.csv`)}
        >
          CSV
        </Button>
        <Tooltip title={inDialog ? 'Close full screen' : 'Open table in full screen'}>
          <IconButton
            aria-label={inDialog ? 'Close full screen' : 'Open table in full screen'}
            onClick={() => setFullScreen(!inDialog)}
            sx={{ width: 36, height: 36, border: `1px solid ${tokens.inputBorder}`, color: tokens.textIdle }}
          >
            {inDialog ? <CloseFullscreenIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );

  const renderTable = (inDialog: boolean) => (
    <TableContainer sx={inDialog ? { flex: 1, overflow: 'auto' } : { overflowX: 'auto' }}>
      <Table
        size="small"
        stickyHeader
        aria-label={`Daily prices for ${code}`}
        sx={{
          '& .MuiTableCell-root': { borderBottom: `1px solid ${tokens.rowLine}`, px: 2.5, py: 0.875 },
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
            {columns.map(column => (
              <TableCell
                key={column.id}
                align={column.numeric ? 'right' : 'left'}
                sortDirection={orderBy === column.id ? order : false}
              >
                <TableSortLabel
                  active={orderBy === column.id}
                  direction={orderBy === column.id ? order : 'asc'}
                  onClick={() => handleSort(column.id)}
                >
                  {column.label}
                  {orderBy === column.id ? (
                    <Box component="span" sx={visuallyHidden}>
                      {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                    </Box>
                  ) : null}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map((row, index) => (
            <TableRow key={row.date} sx={{ bgcolor: index % 2 ? tokens.zebra : tokens.panel }}>
              {columns.map(column => (
                <TableCell
                  key={column.id}
                  align={column.numeric ? 'right' : 'left'}
                  sx={column.numeric ? {
                    ...mono,
                    fontSize: 13,
                    fontWeight: column.id === 'close' ? 500 : 400,
                    color: column.id === 'volume' ? tokens.textSecondary : undefined,
                  } : { fontSize: 13, whiteSpace: 'nowrap' }}
                >
                  {cellContent(row, column)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <>
      <Panel sx={{ overflow: 'hidden' }}>
        {renderHeader(false)}
        {renderTable(false)}
      </Panel>
      <Dialog
        fullScreen
        open={fullScreen}
        onClose={() => setFullScreen(false)}
        aria-labelledby={dialogTitleId}
        slotProps={{ paper: { sx: { display: 'flex', flexDirection: 'column', bgcolor: tokens.panel } } }}
      >
        {renderHeader(true)}
        {renderTable(true)}
      </Dialog>
    </>
  );
};

export default PricesTable;
