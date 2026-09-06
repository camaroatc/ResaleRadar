import type { SummaryTotals } from '../../shared/inventory';
import { formatCents } from '../../shared/money';

interface Props {
  totals: SummaryTotals;
  rangeLabel: string;
  loading: boolean;
}

export function SummaryBar({ totals, rangeLabel, loading }: Props) {
  const metrics = [
    { label: 'Items', value: String(totals.itemCount) },
    { label: 'Listed value', value: formatCents(totals.listPriceCents) },
    { label: 'Cost of goods', value: formatCents(totals.cogsCents) },
    { label: 'Platform fees', value: formatCents(totals.feesCents) },
    { label: 'Net proceeds', value: formatCents(totals.netProceedsCents) },
    { label: 'Profit', value: formatCents(totals.profitCents), emphasis: totals.profitCents < 0 ? 'negative' : 'positive' },
    { label: 'Avg profit / item', value: formatCents(totals.averageProfitCents) },
  ];

  return (
    <section className="summary-bar" aria-label={`Summary metrics, ${rangeLabel}`} aria-busy={loading}>
      {metrics.map((metric) => (
        <div key={metric.label} className="metric">
          <span className="metric-label">{metric.label}</span>
          <span className={`metric-value ${metric.emphasis ?? ''}`}>{loading ? '—' : metric.value}</span>
        </div>
      ))}
    </section>
  );
}
