import { useState } from 'react';
import type { InventoryItem } from '../../shared/inventory';
import { formatCents } from '../../shared/money';

export type SortKey = 'listedAt' | 'title' | 'platform' | 'listPriceCents' | 'cogsCents' | 'feeCents' | 'profitCents';
export type SortDirection = 'asc' | 'desc';

interface Column {
  key: SortKey;
  label: string;
  numeric?: boolean;
}

const COLUMNS: Column[] = [
  { key: 'listedAt', label: 'Listed' },
  { key: 'title', label: 'Item' },
  { key: 'platform', label: 'Platform' },
  { key: 'listPriceCents', label: 'List price', numeric: true },
  { key: 'cogsCents', label: 'COGS', numeric: true },
  { key: 'feeCents', label: 'Fees', numeric: true },
  { key: 'profitCents', label: 'Profit', numeric: true },
];

interface Props {
  items: InventoryItem[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

export function InventoryTable(props: Props) {
  const { items, sortKey, sortDirection, onSort, loading, error, onRetry, hasFilters, onClearFilters } = props;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyTitle = async (item: InventoryItem) => {
    await navigator.clipboard?.writeText(item.title);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId((current) => (current === item.id ? null : current)), 1500);
  };

  if (error) {
    return (
      <div className="state-panel error" role="alert">
        <h2>Inventory could not be loaded</h2>
        <p>{error}</p>
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="inventory-table">
        <caption className="visually-hidden">Inventory items in the selected range</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const active = sortKey === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={column.numeric ? 'numeric' : undefined}
                  aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className="sort-button" onClick={() => onSort(column.key)}>
                    {column.label}
                    <span aria-hidden="true" className="sort-indicator">
                      {active ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                </th>
              );
            })}
            <th scope="col" className="actions-column">
              <span className="visually-hidden">Row actions</span>
            </th>
          </tr>
        </thead>

        <tbody aria-busy={loading}>
          {loading &&
            Array.from({ length: 6 }).map((_, index) => (
              <tr key={`skeleton-${index}`} className="skeleton-row">
                {COLUMNS.map((column) => (
                  <td key={column.key}>
                    <span className="skeleton" />
                  </td>
                ))}
                <td />
              </tr>
            ))}

          {!loading &&
            items.map((item) => (
              <tr key={item.id}>
                <td data-label="Listed">{formatDate(item.listedAt)}</td>
                <td data-label="Item" className="title-cell">
                  {item.title}
                </td>
                <td data-label="Platform">
                  <span className="platform-tag">{item.platform}</span>
                </td>
                <td data-label="List price" className="numeric">
                  {formatCents(item.listPriceCents)}
                </td>
                <td data-label="COGS" className="numeric">
                  {formatCents(item.cogsCents)}
                </td>
                <td data-label="Fees" className="numeric">
                  {formatCents(item.feeCents)}
                  <span className="fee-rate">{(item.feeRate * 100).toFixed(1)}%</span>
                </td>
                <td data-label="Profit" className={`numeric ${item.profitCents < 0 ? 'negative' : 'positive'}`}>
                  {formatCents(item.profitCents)}
                </td>
                <td className="actions-column">
                  <button type="button" className="row-action" onClick={() => copyTitle(item)}>
                    {copiedId === item.id ? 'Copied' : 'Copy title'}
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {!loading && items.length === 0 && (
        <div className="state-panel empty">
          <h2>No inventory in this range</h2>
          <p>
            {hasFilters
              ? 'No items match the current filters and date range.'
              : 'Add your first listing with the form above to start tracking fees and profit.'}
          </p>
          {hasFilters && (
            <button type="button" className="button" onClick={onClearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
