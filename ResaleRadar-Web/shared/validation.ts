import { dollarsToCents } from './money';
import { DEFAULT_COGS_CENTS, isPlatform, PLATFORMS, type Platform } from './inventory';

export interface CreateItemInput {
  title: string;
  platform: Platform;
  listPriceCents: number;
  cogsCents: number;
  listedAt: string;
  clientRequestId?: string;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; value: CreateItemInput }
  | { ok: false; errors: FieldError[] };

const MAX_TITLE_LENGTH = 200;
/** $1,000,000 guard rail against fat-fingered prices. */
const MAX_PRICE_CENTS = 100_000_000;

function normalizeMoney(value: unknown, field: string, errors: FieldError[]): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      errors.push({ field, code: 'invalid_money', message: `${field} must be a non-negative integer amount in cents.` });
      return null;
    }
    if (value > MAX_PRICE_CENTS) {
      errors.push({ field, code: 'out_of_range', message: `${field} exceeds the maximum supported amount.` });
      return null;
    }
    return value;
  }
  if (typeof value === 'string') {
    const cents = dollarsToCents(value);
    if (cents === null) {
      errors.push({ field, code: 'invalid_money', message: `${field} must be a dollar amount with at most 2 decimals.` });
      return null;
    }
    if (cents > MAX_PRICE_CENTS) {
      errors.push({ field, code: 'out_of_range', message: `${field} exceeds the maximum supported amount.` });
      return null;
    }
    return cents;
  }
  errors.push({ field, code: 'invalid_type', message: `${field} must be a number of cents or a dollar string.` });
  return null;
}

/**
 * Validates raw client input. Money is accepted either as integer cents
 * (`listPriceCents`) or as a dollar string (`listPrice`) and always normalized
 * to integer cents before any calculation or write.
 */
export function validateCreateItemInput(raw: unknown, now: Date = new Date()): ValidationResult {
  const errors: FieldError[] = [];

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: [{ field: '', code: 'invalid_payload', message: 'Request body must be an object.' }] };
  }
  const data = raw as Record<string, unknown>;

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (title.length === 0) {
    errors.push({ field: 'title', code: 'required', message: 'Title is required.' });
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.push({ field: 'title', code: 'too_long', message: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` });
  }

  const platform = data.platform;
  if (!isPlatform(platform)) {
    errors.push({
      field: 'platform',
      code: 'unsupported_platform',
      message: `Platform must be one of: ${PLATFORMS.join(', ')}.`,
    });
  }

  const listPriceCents = normalizeMoney(data.listPriceCents ?? data.listPrice, 'listPrice', errors);
  if (listPriceCents === null && !errors.some((e) => e.field === 'listPrice')) {
    errors.push({ field: 'listPrice', code: 'required', message: 'List price is required.' });
  }

  const cogsCents = normalizeMoney(data.cogsCents ?? data.cogs, 'cogs', errors) ?? DEFAULT_COGS_CENTS;

  let listedAt = now.toISOString();
  if (data.listedAt !== undefined && data.listedAt !== null && data.listedAt !== '') {
    const parsed = new Date(String(data.listedAt));
    if (Number.isNaN(parsed.getTime())) {
      errors.push({ field: 'listedAt', code: 'invalid_date', message: 'listedAt must be an ISO-8601 date.' });
    } else {
      listedAt = parsed.toISOString();
    }
  }

  const clientRequestId = typeof data.clientRequestId === 'string' && data.clientRequestId.trim() !== ''
    ? data.clientRequestId.trim()
    : undefined;

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      platform: platform as Platform,
      listPriceCents: listPriceCents as number,
      cogsCents,
      listedAt,
      clientRequestId,
    },
  };
}
