import { missingFirebaseConfigKeys } from '../firebase/app';
import { createDemoRepository } from './demoRepository';
import { firestoreInventoryRepository, type InventoryRepository } from './inventoryRepository';

export const isDemoMode = import.meta.env.VITE_USE_DEMO_DATA === 'true';

export interface RepositoryStatus {
  repository: InventoryRepository | null;
  demo: boolean;
  configError: string | null;
}

export function resolveRepository(): RepositoryStatus {
  if (isDemoMode) {
    return { repository: createDemoRepository(), demo: true, configError: null };
  }

  const missing = missingFirebaseConfigKeys();
  if (missing.length > 0) {
    return {
      repository: null,
      demo: false,
      configError: `Firebase is not configured. Set ${missing.join(', ')} in .env.local, or run with VITE_USE_DEMO_DATA=true for UI development.`,
    };
  }

  return { repository: firestoreInventoryRepository, demo: false, configError: null };
}
