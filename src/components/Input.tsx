interface InputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'decimal' | 'password';
  placeholder?: string;
  suffix?: string;
  error?: string;
  hint?: string;
  max?: number;
}

// 정수: 소수점 이후 버리고 숫자만 허용, 선행 0 제거, 빈 값 유지
function normalizeInteger(raw: string): string {
  const digits = raw.split('.')[0].replace(/[^0-9]/g, '');
  if (digits === '') return '';
  return String(Number(digits));
}

// 소수: 소수점 하나만 허용, 선행 0 제거(0.x 형태는 유지), 음수 불가
function normalizeDecimal(raw: string): string {
  let val = raw.replace(/[^0-9.]/g, '');

  // 소수점이 두 개 이상이면 첫 번째 이후 제거
  const dotIdx = val.indexOf('.');
  if (dotIdx !== -1) {
    val = val.slice(0, dotIdx + 1) + val.slice(dotIdx + 1).replace(/\./g, '');
  }

  // 정수부 선행 0 제거 (0.5는 유지, .5 입력 시 0.5로 정규화)
  const [intPart, decPart] = val.split('.');
  const cleanInt = intPart.replace(/^0+/, '') || (decPart !== undefined ? '0' : '');
  return decPart !== undefined ? `${cleanInt}.${decPart}` : cleanInt;
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
  const isInteger = type === 'number';
  const isDecimal = type === 'decimal';

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="form-input-wrap">
        <input
          className={`form-input${suffix ? ' has-suffix' : ''}`}
          type={type === 'password' ? 'password' : 'text'}
          inputMode={isDecimal ? 'decimal' : isInteger ? 'numeric' : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            let val: string;
            if (isInteger) {
              val = normalizeInteger(e.target.value);
            } else if (isDecimal) {
              val = normalizeDecimal(e.target.value);
            } else {
              val = e.target.value;
            }
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
