interface SummaryCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'positive' | 'negative';
}

export default function SummaryCard({
  label,
  value,
  variant = 'default',
}: SummaryCardProps) {
  const valueClass =
    variant === 'positive'
      ? 'summary-card-value result-positive'
      : variant === 'negative'
        ? 'summary-card-value result-negative'
        : 'summary-card-value';

  return (
    <div className="summary-card">
      <div className="summary-card-label">{label}</div>
      <div className={valueClass}>{value}</div>
    </div>
  );
}
