import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import type { InventoryItem, Platform } from '../../shared/inventory';
import type { FieldError } from '../../shared/validation';
import { getDb, getFns, INVENTORY_COLLECTION } from '../firebase/app';

export interface NewItemDraft {
  title: string;
  listPrice: string;
  platform: Platform;
  cogs?: string;
  listedAt?: string;
  clientRequestId?: string;
}

export class InventoryValidationError extends Error {
  readonly errors: FieldError[];

  constructor(errors: FieldError[]) {
    super(errors.map((e) => e.message).join(' '));
    this.name = 'InventoryValidationError';
    this.errors = errors;
  }
}

export interface InventoryRepository {
  /** Subscribes to the live inventory list; returns an unsubscribe function. */
  subscribe(onData: (items: InventoryItem[]) => void, onError: (error: Error) => void): () => void;
  createItem(draft: NewItemDraft): Promise<InventoryItem>;
}

function toIso(value: unknown, fallback: string): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return value;
  return fallback;
}

function toItem(id: string, data: Record<string, unknown>): InventoryItem {
  const nowIso = new Date(0).toISOString();
  return {
    id,
    title: String(data.title ?? ''),
    platform: (data.platform ?? 'other') as Platform,
    listPriceCents: Number(data.listPriceCents ?? 0),
    cogsCents: Number(data.cogsCents ?? 0),
    feeRate: Number(data.feeRate ?? 0),
    feeCents: Number(data.feeCents ?? 0),
    netProceedsCents: Number(data.netProceedsCents ?? 0),
    profitCents: Number(data.profitCents ?? 0),
    listedAt: toIso(data.listedAt, nowIso),
    createdAt: toIso(data.createdAt, nowIso),
    updatedAt: toIso(data.updatedAt, nowIso),
  };
}

interface CallableError {
  code?: string;
  details?: { errors?: FieldError[] };
  message?: string;
}

/** Production data access: Firestore for reads, Cloud Function for writes. */
export const firestoreInventoryRepository: InventoryRepository = {
  subscribe(onData, onError) {
    const q = query(collection(getDb(), INVENTORY_COLLECTION), orderBy('listedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => onData(snapshot.docs.map((doc) => toItem(doc.id, doc.data()))),
      (error) => onError(error),
    );
  },

  async createItem(draft) {
    const callable = httpsCallable<NewItemDraft, { item: InventoryItem }>(getFns(), 'createItem');
    try {
      const result: HttpsCallableResult<{ item: InventoryItem }> = await callable(draft);
      return result.data.item;
    } catch (error) {
      const callableError = error as CallableError;
      const fieldErrors = callableError.details?.errors;
      if (fieldErrors && fieldErrors.length > 0) throw new InventoryValidationError(fieldErrors);
      throw error instanceof Error ? error : new Error('Failed to save item.');
    }
  },
};
