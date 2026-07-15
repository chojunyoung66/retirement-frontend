interface HouseholdChipsProps {
  value: number;
  onChange: (size: number) => void;
}

const OPTIONS = [1, 2, 3, 4, 5];

export default function HouseholdChips({ value, onChange }: HouseholdChipsProps) {
  return (
    <div className="chip-group">
      {OPTIONS.map((n) => (
        <button
          key={n}
          type="button"
          className={`chip${value === n ? ' selected' : ''}`}
          onClick={() => onChange(n)}
        >
          {n}인
        </button>
      ))}
    </div>
  );
}
