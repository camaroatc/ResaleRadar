import { useMemo, useState } from 'react';
import { PLATFORMS, summarize, type InventoryItem, type Platform } from '../shared/inventory';
import { isWithinRange, rangeLabel, resolveRange, type RangeUnit } from '../shared/range';
import { AddItemForm } from './components/AddItemForm';
import { InventoryTable, type SortDirection, type SortKey } from './components/InventoryTable';
import { RangeControl } from './components/RangeControl';
import { SummaryBar } from './components/SummaryBar';
import { useInventory } from './hooks/useInventory';

function compare(a: InventoryItem, b: InventoryItem, key: SortKey): number {
  const left = a[key];
  const right = b[key];
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

export default function App() {
  const { items, state, error, demo, createItem, retry } = useInventory();
  const [unit, setUnit] = useState<RangeUnit>('weeks');
  const [count, setCount] = useState(4);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<Platform | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('listedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const range = useMemo(() => resolveRange(unit, count), [unit, count]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = items.filter(
      (item) =>
        isWithinRange(item.listedAt, range) &&
        (platform === 'all' || item.platform === platform) &&
        (term === '' || item.title.toLowerCase().includes(term)),
    );
    return filtered.sort((a, b) => (sortDirection === 'asc' ? compare(a, b, sortKey) : compare(b, a, sortKey)));
  }, [items, range, platform, search, sortKey, sortDirection]);

  const totals = useMemo(() => summarize(visibleItems), [visibleItems]);
  const hasFilters = search.trim() !== '' || platform !== 'all';

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'title' || key === 'platform' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="app">
      <a className="skip-link" href="#inventory">
        Skip to inventory
      </a>

      <header className="app-header">
        <div>
          <h1>ResaleRadar</h1>
          <p className="subtitle">One continuous inventory ledger — {rangeLabel(unit, count).toLowerCase()}</p>
        </div>
        <RangeControl
          unit={unit}
          count={count}
          onChange={(nextUnit, nextCount) => {
            setUnit(nextUnit);
            setCount(nextCount);
          }}
        />
      </header>

      {demo && (
        <p className="banner" role="status">
          Demo data — this is in-memory sample inventory for UI development, not your Firestore data.
        </p>
      )}

      <SummaryBar totals={totals} rangeLabel={rangeLabel(unit, count)} loading={state === 'loading'} />

      <AddItemForm onCreate={createItem} disabled={state === 'error'} />

      <section className="toolbar" aria-label="Inventory filters">
        <label className="field grow">
          <span className="field-label">Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles"
          />
        </label>

        <label className="field">
          <span className="field-label">Platform</span>
          <select value={platform} onChange={(event) => setPlatform(event.target.value as Platform | 'all')}>
            <option value="all">All platforms</option>
            {PLATFORMS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <p className="result-count" role="status">
          {state === 'loading' ? 'Loading inventory…' : `${visibleItems.length} of ${items.length} items`}
        </p>
      </section>

      <main id="inventory">
        <InventoryTable
          items={visibleItems}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={onSort}
          loading={state === 'loading'}
          error={state === 'error' ? error : null}
          onRetry={retry}
          hasFilters={hasFilters}
          onClearFilters={() => {
            setSearch('');
            setPlatform('all');
          }}
        />
      </main>
    </div>
  );
}
