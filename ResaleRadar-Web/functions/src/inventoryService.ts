import { createHash } from 'node:crypto';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { calculateFinancials, type InventoryItem } from '../../shared/inventory';
import { validateCreateItemInput, type FieldError } from '../../shared/validation';

export const INVENTORY_COLLECTION = process.env.INVENTORY_COLLECTION ?? 'inventoryItems';

export interface CreateItemFailure {
  ok: false;
  status: 'invalid-argument';
  errors: FieldError[];
}

export interface CreateItemSuccess {
  ok: true;
  item: InventoryItem;
  /** True when an existing item was returned for a repeated clientRequestId. */
  deduplicated: boolean;
}

export type CreateItemResult = CreateItemSuccess | CreateItemFailure;

function documentIdFor(clientRequestId: string): string {
  return createHash('sha256').update(clientRequestId).digest('hex').slice(0, 32);
}

/**
 * Validates, prices and persists a single inventory item.
 * Passing the same `clientRequestId` twice returns the original item instead of
 * writing a duplicate.
 */
export async function createInventoryItem(
  raw: unknown,
  db: Firestore = getFirestore(),
  now: Date = new Date(),
): Promise<CreateItemResult> {
  const validated = validateCreateItemInput(raw, now);
  if (!validated.ok) {
    return { ok: false, status: 'invalid-argument', errors: validated.errors };
  }

  const input = validated.value;
  const financials = calculateFinancials({
    platform: input.platform,
    listPriceCents: input.listPriceCents,
    cogsCents: input.cogsCents,
  });

  const collection = db.collection(INVENTORY_COLLECTION);
  const ref = input.clientRequestId
    ? collection.doc(documentIdFor(input.clientRequestId))
    : collection.doc();

  const timestamp = now.toISOString();
  const item: InventoryItem = {
    id: ref.id,
    title: input.title,
    platform: input.platform,
    listPriceCents: input.listPriceCents,
    cogsCents: input.cogsCents,
    feeRate: financials.feeRate,
    feeCents: financials.feeCents,
    netProceedsCents: financials.netProceedsCents,
    profitCents: financials.profitCents,
    listedAt: input.listedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const existing = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (snapshot.exists) return snapshot.data() as InventoryItem;
    tx.set(ref, item);
    return null;
  });

  return existing
    ? { ok: true, item: existing, deduplicated: true }
    : { ok: true, item, deduplicated: false };
}
