import { describe, expect, it } from 'vitest';
import { calculateFinancials, feeRateForPlatform, summarize, type InventoryItem } from './inventory';
import { dollarsToCents, formatCents } from './money';
import { validateCreateItemInput } from './validation';
import { isWithinRange, resolveRange } from './range';

describe('fee calculation', () => {
  it('applies the 13.6% eBay fee rate', () => {
    const result = calculateFinancials({ platform: 'ebay', listPriceCents: 10_000, cogsCents: 2_500 });
    expect(result.feeRate).toBe(0.136);
    expect(result.feeCents).toBe(1_360);
    expect(result.netProceedsCents).toBe(8_640);
    expect(result.profitCents).toBe(6_140);
  });

  it('rounds eBay fees half up to the nearest cent', () => {
    // 1999 * 0.136 = 271.864 -> 272
    expect(calculateFinancials({ platform: 'ebay', listPriceCents: 1_999 }).feeCents).toBe(272);
    // 125 * 0.136 = 17.0 -> 17
    expect(calculateFinancials({ platform: 'ebay', listPriceCents: 125 }).feeCents).toBe(17);
  });

  it('defaults cost of goods to $0.00 when omitted', () => {
    const result = calculateFinancials({ platform: 'ebay', listPriceCents: 5_000 });
    expect(result.profitCents).toBe(5_000 - 680);
  });

  it('charges no fee on non-eBay platforms until a rate is defined', () => {
    const result = calculateFinancials({ platform: 'mercari', listPriceCents: 10_000, cogsCents: 1_000 });
    expect(result.feeRate).toBe(0);
    expect(result.feeCents).toBe(0);
    expect(result.profitCents).toBe(9_000);
  });

  it('rejects non-integer or negative money', () => {
    expect(() => calculateFinancials({ platform: 'ebay', listPriceCents: 10.5 })).toThrow(RangeError);
    expect(() => calculateFinancials({ platform: 'ebay', listPriceCents: -1 })).toThrow(RangeError);
  });

  it('exposes the fee rate per platform', () => {
    expect(feeRateForPlatform('ebay')).toBe(0.136);
    expect(feeRateForPlatform('other')).toBe(0);
  });
});

describe('input validation', () => {
  const now = new Date('2026-02-01T00:00:00.000Z');

  it('accepts a minimal payload and defaults COGS to zero', () => {
    const result = validateCreateItemInput({ title: '  Nikon FE  ', listPrice: '129.99', platform: 'ebay' }, now);
    expect(result).toMatchObject({
      ok: true,
      value: { title: 'Nikon FE', listPriceCents: 12_999, cogsCents: 0, listedAt: now.toISOString() },
    });
  });

  it('accepts integer cents directly', () => {
    const result = validateCreateItemInput({ title: 'Lens', listPriceCents: 4_200, platform: 'etsy' }, now);
    expect(result.ok && result.value.listPriceCents).toBe(4_200);
  });

  it('rejects unknown platforms', () => {
    const result = validateCreateItemInput({ title: 'Lens', listPrice: '10.00', platform: 'craigslist' }, now);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toMatchObject({ field: 'platform', code: 'unsupported_platform' });
  });

  it('rejects invalid prices without defaulting them', () => {
    for (const listPrice of ['abc', '-5', '1.234', '']) {
      const result = validateCreateItemInput({ title: 'Lens', listPrice, platform: 'ebay' }, now);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.errors.some((e) => e.field === 'listPrice')).toBe(true);
    }
  });

  it('rejects a missing title and reports every field error at once', () => {
    const result = validateCreateItemInput({ title: '   ', platform: 'nope' }, now);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.map((e) => e.field).sort()).toEqual(['listPrice', 'platform', 'title']);
  });

  it('rejects a non-object payload', () => {
    expect(validateCreateItemInput(null, now).ok).toBe(false);
  });
});

describe('money helpers', () => {
  it('parses dollar strings into cents', () => {
    expect(dollarsToCents('$1,299.99')).toBe(129_999);
    expect(dollarsToCents('12')).toBe(1_200);
    expect(dollarsToCents('12.5')).toBe(1_250);
    expect(dollarsToCents('12.345')).toBeNull();
  });

  it('formats cents for display', () => {
    expect(formatCents(129_999)).toBe('$1,299.99');
  });
});

function item(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'x',
    title: 't',
    platform: 'ebay',
    listPriceCents: 10_000,
    cogsCents: 0,
    feeRate: 0.136,
    feeCents: 1_360,
    netProceedsCents: 8_640,
    profitCents: 8_640,
    listedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('summaries and ranges', () => {
  it('totals the active item set', () => {
    const totals = summarize([item({ id: 'a' }), item({ id: 'b', cogsCents: 1_000, profitCents: 7_640 })]);
    expect(totals).toMatchObject({
      itemCount: 2,
      listPriceCents: 20_000,
      feesCents: 2_720,
      profitCents: 16_280,
      averageProfitCents: 8_140,
    });
  });

  it('returns zeroed totals for an empty set', () => {
    expect(summarize([])).toMatchObject({ itemCount: 0, profitCents: 0, averageProfitCents: 0 });
  });

  it('filters by weeks and months windows', () => {
    const now = new Date('2026-03-15T12:00:00.000Z');
    const oneWeek = resolveRange('weeks', 1, now);
    const threeMonths = resolveRange('months', 3, now);
    expect(isWithinRange('2026-03-12T00:00:00.000Z', oneWeek)).toBe(true);
    expect(isWithinRange('2026-02-12T00:00:00.000Z', oneWeek)).toBe(false);
    expect(isWithinRange('2026-02-12T00:00:00.000Z', threeMonths)).toBe(true);
    expect(isWithinRange('2025-11-12T00:00:00.000Z', threeMonths)).toBe(false);
  });
});
