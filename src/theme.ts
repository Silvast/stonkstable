import { createTheme } from '@mui/material';

export const tokens = {
  ground: '#F3F5F8',
  panel: '#FFFFFF',
  border: '#E2E6EC',
  rowLine: '#F0F2F5',
  inputBorder: '#D5DBE3',
  text: '#121826',
  textSecondary: '#586172',
  textIdle: '#3B4352',
  primary: '#0F6E7A',
  primaryDark: '#0A505A',
  primaryTint: '#E5F1F2',
  up: '#0B7A48',
  upTint: '#E3F3EA',
  upOnTint: '#0B6B3F',
  down: '#C2341B',
  downTint: '#FBE4DE',
  downOnTint: '#A12A14',
  neutralChip: '#EEF1F5',
  segmentGround: '#E9EDF2',
  star: '#C27803',
  warningTint: '#FFF4E0',
  warningOnTint: '#7A4B00',
  tableHeader: '#F7F9FB',
  zebra: '#FAFBFC',
  ink: '#121826',
  fontSans: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontMono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

export const mono = {
  fontFamily: tokens.fontMono,
  fontVariantNumeric: 'tabular-nums',
} as const;

export const theme = createTheme({
  palette: {
    primary: { main: tokens.primary, dark: tokens.primaryDark, light: tokens.primaryTint },
    success: { main: tokens.up },
    error: { main: tokens.down },
    text: { primary: tokens.text, secondary: tokens.textSecondary },
    background: { default: tokens.ground, paper: tokens.panel },
    divider: tokens.border,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: tokens.fontSans,
    fontSize: 14,
    h1: { fontSize: '1.5rem', fontWeight: 600 },
    h2: { fontSize: '0.9375rem', fontWeight: 600 },
    h6: { fontSize: '0.9375rem', fontWeight: 600 },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.75rem' },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  breakpoints: {
    values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: tokens.ground, color: tokens.text },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 40, borderRadius: 10 },
        sizeSmall: { minHeight: 36, borderRadius: 8 },
        outlined: { borderColor: tokens.inputBorder, color: tokens.text },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 10, backgroundColor: tokens.panel },
        notchedOutline: { borderColor: tokens.inputBorder },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        rounded: { borderRadius: 12 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
  },
});
