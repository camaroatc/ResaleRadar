import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

/**
 * Firebase configuration is read from Vite environment variables so no project
 * identifiers or keys are committed. See .env.example and the README.
 */
const config: Partial<FirebaseOptions> = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const REQUIRED_KEYS = ['apiKey', 'projectId', 'appId'] as const;

export function missingFirebaseConfigKeys(): string[] {
  return REQUIRED_KEYS.filter((key) => !config[key]).map((key) => `VITE_FIREBASE_${camelToEnv(key)}`);
}

function camelToEnv(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase();
}

let app: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  const missing = missingFirebaseConfigKeys();
  if (missing.length > 0) {
    throw new Error(`Missing Firebase configuration: ${missing.join(', ')}. Copy .env.example to .env.local.`);
  }
  app ??= initializeApp(config as FirebaseOptions);
  return app;
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFns(): Functions {
  return getFunctions(getFirebaseApp(), import.meta.env.VITE_FUNCTIONS_REGION || 'us-central1');
}

export const INVENTORY_COLLECTION = import.meta.env.VITE_INVENTORY_COLLECTION || 'inventoryItems';
