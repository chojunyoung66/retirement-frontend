interface InputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'password';
  placeholder?: string;
  suffix?: string;
  error?: string;
  hint?: string;
  max?: number;
}

export default function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  suffix,
  error,
  hint,
  max,
}: InputProps) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="form-input-wrap">
        <input
          className={`form-input${suffix ? ' has-suffix' : ''}`}
          type={type === 'number' ? 'text' : type}
          inputMode={type === 'number' ? 'numeric' : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            let val = type === 'number'
              ? e.target.value.replace(/[^0-9]/g, '')
              : e.target.value;
            if (max !== undefined && val !== '' && Number(val) > max) {
              val = String(max);
            }
            onChange(val);
          }}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
      {hint && !error && <div className="form-hint">{hint}</div>}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
