import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { createInventoryItem } from './inventoryService';

initializeApp();
setGlobalOptions({ region: process.env.FUNCTIONS_REGION ?? 'us-central1', maxInstances: 10 });

/** Callable used by the dashboard: createInventoryItem({ title, listPrice, platform }). */
export const createItem = onCall(async (request) => {
  const result = await createInventoryItem(request.data, getFirestore());
  if (!result.ok) {
    throw new HttpsError('invalid-argument', 'Invalid inventory item.', { errors: result.errors });
  }
  return { item: result.item, deduplicated: result.deduplicated };
});

/** HTTPS equivalent for scripts and integrations. */
export const createItemHttp = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method-not-allowed', message: 'Use POST.' } });
    return;
  }

  const result = await createInventoryItem(req.body, getFirestore());
  if (!result.ok) {
    res.status(400).json({ error: { code: result.status, message: 'Invalid inventory item.', errors: result.errors } });
    return;
  }

  res.status(result.deduplicated ? 200 : 201).json({ item: result.item, deduplicated: result.deduplicated });
});
