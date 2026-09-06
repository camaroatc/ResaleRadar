import { isValidCents, roundCents } from './money';

/**
 * Supported selling platforms. Unknown platforms are rejected at the function
 * boundary so no financial record is written with an undefined fee policy.
 */
export const PLATFORMS = ['ebay', 'mercari', 'poshmark', 'depop', 'etsy', 'facebook', 'other'] as const;

export type Platform = (typeof PLATFORMS)[number];

/**
 * Fee policy. Only eBay has a business-defined rate today (13.6%). Other
 * platforms default to 0 until their rate is specified; see README assumptions.
 */
export const PLATFORM_FEE_RATES: Record<Platform, number> = {
  ebay: 0.136,
  mercari: 0,
  poshmark: 0,
  depop: 0,
  etsy: 0,
  facebook: 0,
  other: 0,
};

export const DEFAULT_COGS_CENTS = 0;

export interface InventoryItem {
  id: string;
  title: string;
  platform: Platform;
  listPriceCents: number;
  cogsCents: number;
  feeRate: number;
  feeCents: number;
  netProceedsCents: number;
  profitCents: number;
  /** ISO-8601 timestamp used for every range filter and summary metric. */
  listedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemFinancials {
  feeRate: number;
  feeCents: number;
  netProceedsCents: number;
  profitCents: number;
}

export function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && (PLATFORMS as readonly string[]).includes(value);
}

export function feeRateForPlatform(platform: Platform): number {
  return PLATFORM_FEE_RATES[platform];
}

/**
 * Deterministic fee/profit math. Fees round half up to the nearest cent.
 * Shipping and sales tax are out of scope; see README assumptions.
 */
export function calculateFinancials(params: {
  platform: Platform;
  listPriceCents: number;
  cogsCents?: number;
}): ItemFinancials {
  const { platform, listPriceCents } = params;
  const cogsCents = params.cogsCents ?? DEFAULT_COGS_CENTS;

  if (!isValidCents(listPriceCents)) throw new RangeError('listPriceCents must be a non-negative integer');
  if (!isValidCents(cogsCents)) throw new RangeError('cogsCents must be a non-negative integer');

  const feeRate = feeRateForPlatform(platform);
  const feeCents = roundCents(listPriceCents * feeRate);
  const netProceedsCents = listPriceCents - feeCents;

  return {
    feeRate,
    feeCents,
    netProceedsCents,
    profitCents: netProceedsCents - cogsCents,
  };
}

export interface SummaryTotals {
  itemCount: number;
  listPriceCents: number;
  cogsCents: number;
  feesCents: number;
  netProceedsCents: number;
  profitCents: number;
  averageProfitCents: number;
}

export function summarize(items: readonly InventoryItem[]): SummaryTotals {
  const totals = items.reduce(
    (acc, item) => ({
      listPriceCents: acc.listPriceCents + item.listPriceCents,
      cogsCents: acc.cogsCents + item.cogsCents,
      feesCents: acc.feesCents + item.feeCents,
      netProceedsCents: acc.netProceedsCents + item.netProceedsCents,
      profitCents: acc.profitCents + item.profitCents,
    }),
    { listPriceCents: 0, cogsCents: 0, feesCents: 0, netProceedsCents: 0, profitCents: 0 },
  );

  return {
    itemCount: items.length,
    ...totals,
    averageProfitCents: items.length === 0 ? 0 : roundCents(totals.profitCents / items.length),
  };
}
