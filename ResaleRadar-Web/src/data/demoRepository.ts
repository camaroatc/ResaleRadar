/**
 * UI-development only. Enabled with VITE_USE_DEMO_DATA=true and never used when
 * Firebase configuration is present. The dashboard renders a banner while this
 * in-memory source is active so demo data is never mistaken for real inventory.
 */
import { calculateFinancials, type InventoryItem } from '../../shared/inventory';
import { dollarsToCents } from '../../shared/money';
import { validateCreateItemInput } from '../../shared/validation';
import { InventoryValidationError, type InventoryRepository, type NewItemDraft } from './inventoryRepository';

function build(
  id: string,
  title: string,
  platform: InventoryItem['platform'],
  listPrice: string,
  cogs: string,
  daysAgo: number,
): InventoryItem {
  const listPriceCents = dollarsToCents(listPrice) ?? 0;
  const cogsCents = dollarsToCents(cogs) ?? 0;
  const financials = calculateFinancials({ platform, listPriceCents, cogsCents });
  const listedAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return {
    id,
    title,
    platform,
    listPriceCents,
    cogsCents,
    listedAt,
    createdAt: listedAt,
    updatedAt: listedAt,
    ...financials,
  };
}

const seed: InventoryItem[] = [
  build('demo-1', 'Nikon FE 35mm Camera Body', 'ebay', '189.99', '60.00', 2),
  build('demo-2', 'Vintage Levis 501 Jeans 34x32', 'ebay', '74.50', '12.00', 5),
  build('demo-3', 'Sony WH-1000XM4 Headphones', 'mercari', '164.00', '95.00', 9),
  build('demo-4', 'Keychron Q1 Knob Version', 'ebay', '129.00', '0', 20),
  build('demo-5', 'Pyrex Mixing Bowl Set', 'facebook', '48.00', '10.00', 45),
  build('demo-6', 'Patagonia Retro-X Fleece', 'poshmark', '155.00', '35.00', 96),
];

export function createDemoRepository(): InventoryRepository {
  let items = [...seed];
  const listeners = new Set<(items: InventoryItem[]) => void>();

  const emit = () => {
    const snapshot = [...items].sort((a, b) => b.listedAt.localeCompare(a.listedAt));
    listeners.forEach((listener) => listener(snapshot));
  };

  return {
    subscribe(onData) {
      listeners.add(onData);
      const timer = setTimeout(emit, 400);
      return () => {
        clearTimeout(timer);
        listeners.delete(onData);
      };
    },

    async createItem(draft: NewItemDraft) {
      const validated = validateCreateItemInput(draft);
      if (!validated.ok) throw new InventoryValidationError(validated.errors);
      const { title, platform, listPriceCents, cogsCents, listedAt } = validated.value;
      const financials = calculateFinancials({ platform, listPriceCents, cogsCents });
      const item: InventoryItem = {
        id: `demo-${crypto.randomUUID()}`,
        title,
        platform,
        listPriceCents,
        cogsCents,
        listedAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...financials,
      };
      items = [item, ...items];
      emit();
      return item;
    },
  };
}
