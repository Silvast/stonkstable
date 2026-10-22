export interface ParsedOrder {
  side: 'buy' | 'sell';
  instrument: string;
  instrumentUrl?: string;
  account?: string;
  orderType?: string;
  quantity: number;
  price: number;
  currency: string;
  /** absolute value */
  commission: number;
  total?: number;
  /** 'YYYY-MM-DD' */
  validUntil?: string;
}

export type MissingField = 'instrument' | 'side' | 'quantity' | 'price';

export type ParseResult =
  | { ok: true; order: ParsedOrder; warnings: string[] }
  | { ok: false; missing: MissingField[]; partial: Partial<ParsedOrder> };

const NORDNET_HOSTS = ['nordnet.fi', 'nordnet.se', 'nordnet.no', 'nordnet.dk'];

const LABELS = [
  'Toimeksiantotyyppi',
  'Välityspalkkio',
  'Instrumentti',
  'Voimassaolo',
  'Yhteensä',
  'Osta/myy',
  'Hinta/kpl',
  'Määrä',
  'Tili',
] as const;

type Label = (typeof LABELS)[number];

interface Field {
  value: string;
  lines: string[];
}

const BULLETS = /^\s*[*\u2022-]\s*/;

/** `\r\n` → `\n`, no-break spaces → spaces, unicode minus → `-`, no bullets, no blank lines. */
export function normalisePaste(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00a0\u202f\u2007]/g, ' ')
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .split('\n')
    .map(line => line.trim().replace(BULLETS, '').trim())
    .filter(line => line !== '');
}

const labelAt = (line: string): Label | null => LABELS.find(label => line.startsWith(label)) ?? null;

/** Value of every recognised label: the rest of its line plus the lines up to the next label. */
function fields(lines: string[]): Partial<Record<Label, Field>> {
  const found: { label: Label; index: number }[] = [];
  lines.forEach((line, index) => {
    const label = labelAt(line);
    if (label && !found.some(entry => entry.label === label)) found.push({ label, index });
  });

  const result: Partial<Record<Label, Field>> = {};
  found.forEach((entry, position) => {
    const first = lines[entry.index].slice(entry.label.length).trim().replace(/^[\u00b7:\u2022*\u2013-]\s*/, '').trim();
    const rest = lines.slice(entry.index + 1, found[position + 1]?.index ?? lines.length);
    result[entry.label] = { value: first, lines: rest };
  });
  return result;
}

/** '1 234,50 EUR' → 1234.5, '−0,00' → 0 */
export function parseFinnishNumber(text: string): number | null {
  if (typeof text !== 'string') return null;
  const compact = text.replace(/[\s\u00a0\u202f]/g, '').replace(/[\u2212\u2013\u2014]/g, '-');
  const match = compact.match(/[-+]?\d+(?:[.,]\d+)?/);
  if (!match) return null;

  const value = Number.parseFloat(match[0].replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  return value === 0 ? 0 : value;
}

interface Money {
  value: number;
  currency?: string;
}

function parseMoney(text: string): Money | null {
  const match = text.match(/(-?\d[\d\s.,]*)\s*([A-Za-z]{3})?/);
  if (!match) return null;
  const value = parseFinnishNumber(match[1]);
  if (value === null) return null;
  return { value, currency: match[2]?.toUpperCase() };
}

const MARKDOWN_LINK = /^\[([^\]]+)\]\(([^)]+)\)/;

const isNordnetUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return parsed.protocol === 'https:' && NORDNET_HOSTS.includes(host);
  } catch {
    return false;
  }
};

/** The whole value of a field: the rest of its line and the lines below it. */
const fieldText = (field: Field): string => [field.value, ...field.lines].filter(line => line !== '').join(' ');

function readInstrument(raw: string): { instrument: string; instrumentUrl?: string } {
  const trimmed = raw.trim().replace(/^[\u00b7:\u2022*\u2013-]\s*/, '');
  const link = trimmed.match(MARKDOWN_LINK);
  if (!link) return { instrument: trimmed };

  const instrument = link[1].trim();
  const url = link[2].trim();
  return isNordnetUrl(url) ? { instrument, instrumentUrl: url } : { instrument };
}

function readSide(field: Field): 'buy' | 'sell' | undefined {
  const raw = fieldText(field);
  if (/osto/i.test(raw)) return 'buy';
  if (/myynti|myy/i.test(raw)) return 'sell';
  return undefined;
}

function readAccount(field: Field | undefined): string | undefined {
  if (!field) return undefined;
  const account = fieldText(field).replace(/\s+/g, ' ').replace(/\s*\u00b7\s*/g, ' · ').trim();
  return account === '' ? undefined : account;
}

function readDate(field: Field | undefined): string | undefined {
  if (!field) return undefined;
  const match = fieldText(field).match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  if (!match) return undefined;
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

const TOTAL_MISMATCH = "Total doesn't match quantity × price";

/**
 * Parses the text of a Nordnet "Vahvista toimeksianto" screen.
 * Copying from the web page mangles the layout, so labels are matched at the
 * start of a line and values may sit on the label line or on the lines below it.
 */
export function parseNordnetOrder(text: string): ParseResult {
  const parsed = fields(normalisePaste(text));

  const instrument = parsed.Instrumentti ? readInstrument(fieldText(parsed.Instrumentti)) : undefined;
  const side = parsed['Osta/myy'] ? readSide(parsed['Osta/myy']) : undefined;
  const quantity = parseFinnishNumber(parsed['Määrä'] ? fieldText(parsed['Määrä']) : '');
  const price = parsed['Hinta/kpl'] ? parseMoney(fieldText(parsed['Hinta/kpl'])) : null;
  const commission = parsed['Välityspalkkio'] ? parseMoney(fieldText(parsed['Välityspalkkio'])) : null;
  const total = parsed['Yhteensä'] ? parseMoney(fieldText(parsed['Yhteensä'])) : null;
  const account = readAccount(parsed.Tili);
  const validUntil = readDate(parsed.Voimassaolo);

  const partial: Partial<ParsedOrder> = {
    ...(instrument?.instrument ? { instrument: instrument.instrument } : {}),
    ...(instrument?.instrumentUrl ? { instrumentUrl: instrument.instrumentUrl } : {}),
    ...(side ? { side } : {}),
    ...(quantity !== null && quantity > 0 ? { quantity } : {}),
    ...(price ? { price: price.value } : {}),
    ...(price?.currency ? { currency: price.currency } : {}),
    ...(parsed.Toimeksiantotyyppi?.value.trim() ? { orderType: parsed.Toimeksiantotyyppi.value.trim() } : {}),
    ...(account ? { account } : {}),
    ...(commission ? { commission: Math.abs(commission.value) } : {}),
    ...(total ? { total: total.value } : {}),
    ...(validUntil ? { validUntil } : {}),
  };

  const missing: MissingField[] = [];
  if (!partial.instrument) missing.push('instrument');
  if (!partial.side) missing.push('side');
  if (!partial.quantity) missing.push('quantity');
  if (!price || !(price.value > 0)) missing.push('price');

  if (missing.length > 0) return { ok: false, missing, partial };

  const order: ParsedOrder = {
    side: partial.side as 'buy' | 'sell',
    instrument: partial.instrument as string,
    quantity: partial.quantity as number,
    price: partial.price as number,
    currency: partial.currency ?? 'EUR',
    commission: partial.commission ?? 0,
    ...(partial.instrumentUrl ? { instrumentUrl: partial.instrumentUrl } : {}),
    ...(partial.account ? { account: partial.account } : {}),
    ...(partial.orderType ? { orderType: partial.orderType } : {}),
    ...(total ? { total: total.value } : {}),
    ...(validUntil ? { validUntil } : {}),
  };

  const warnings: string[] = [];
  if (total && Math.abs(total.value - order.quantity * order.price) > 0.01 && Math.abs(total.value - (order.quantity * order.price - order.commission)) > 0.01) {
    warnings.push(TOTAL_MISMATCH);
  }

  return { ok: true, order, warnings };
}