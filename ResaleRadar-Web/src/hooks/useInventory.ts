import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { InventoryItem } from '../../shared/inventory';
import { resolveRepository } from '../data/repository';
import type { NewItemDraft } from '../data/inventoryRepository';

export type LoadState = 'loading' | 'ready' | 'error';

export function useInventory() {
  const { repository, demo, configError } = useMemo(() => resolveRepository(), []);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [state, setState] = useState<LoadState>(configError ? 'error' : 'loading');
  const [error, setError] = useState<string | null>(configError);
  const repositoryRef = useRef(repository);

  useEffect(() => {
    if (!repository) return;
    const unsubscribe = repository.subscribe(
      (next) => {
        setItems(next);
        setState('ready');
        setError(null);
      },
      (subscriptionError) => {
        setState('error');
        setError(subscriptionError.message);
      },
    );
    return unsubscribe;
  }, [repository]);

  const createItem = useCallback(async (draft: NewItemDraft) => {
    const repo = repositoryRef.current;
    if (!repo) throw new Error('Inventory backend is not configured.');
    return repo.createItem(draft);
  }, []);

  const retry = useCallback(() => window.location.reload(), []);

  return { items, state, error, demo, createItem, retry };
}
