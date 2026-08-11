export const PASHX_MAX_SAFE_AMOUNT_MICROS = Number.MAX_SAFE_INTEGER;
export const PASHX_MIN_SAFE_AMOUNT_MICROS = Number.MIN_SAFE_INTEGER;

export type PashxCurrencyAmount = Readonly<{
  amountMicros: number;
  currencyCode: string;
}>;

export const isSafeAmountMicros = (value: number): boolean =>
  Number.isSafeInteger(value) &&
  value >= PASHX_MIN_SAFE_AMOUNT_MICROS &&
  value <= PASHX_MAX_SAFE_AMOUNT_MICROS;

export const isIsoCurrencyCode = (value: string): boolean =>
  /^[A-Z]{3}$/.test(value);
