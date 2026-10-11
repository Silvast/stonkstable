export const DASH = '–';

export const formatPrice = (value: number | null): string =>
  value === null ? DASH : value.toFixed(2);

export const formatPercent = (value: number | null): string =>
  value === null ? DASH : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
