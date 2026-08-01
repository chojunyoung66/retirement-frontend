interface MiniBarChartProps {
  values: number[];
  labels: string[];
  highlightIndex: number;
  ariaLabel: string;
}

export default function MiniBarChart({
  values,
  labels,
  highlightIndex,
  ariaLabel,
}: MiniBarChartProps) {
  const max = Math.max(...values, 1);

  return (
    <div className="lp-chart">
      <div className="lp-chart-bars" role="img" aria-label={ariaLabel}>
        {values.map((value, i) => (
          <div
            key={i}
            className={
              i === highlightIndex ? 'lp-chart-bar lp-chart-bar-hl' : 'lp-chart-bar'
            }
            style={{
              height: `${(value / max) * 100}%`,
              animationDelay: `${i * 35}ms`,
            }}
          />
        ))}
      </div>
      <div className="lp-chart-labels">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
