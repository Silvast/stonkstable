export const DASH = '–';

export const formatPrice = (value: number | null): string =>
  value === null ? DASH : value.toFixed(2);

export const formatPercent = (value: number | null): string =>
  value === null ? DASH : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

export const changeColor = (value: number | null): string => {
  if (value === null || value === 0) return 'text.primary';
  return value > 0 ? 'success.main' : 'error.main';
};
