interface ProgressBarProps {
  progress: number;
  label?: string;
}

export default function ProgressBar({ progress, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div className="progress-section">
      <div className="progress-label">
        <span>{label ?? '진단 진행률'}</span>
        <span>{clamped}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
