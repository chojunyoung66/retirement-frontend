import { formatRuleBasis, readRuleBasis } from '../utils/rule-basis';

/** 시뮬레이션 결과 하단의 기준일·제도버전 표시 — 기준일이 없는 이전 결과는 그리지 않는다 */
export default function RuleBasisNote({ output }: { output: unknown }) {
  const basis = readRuleBasis(output);
  if (!basis) return null;
  return (
    <p className="form-hint" style={{ marginBottom: 0 }}>
      {formatRuleBasis(basis)}
    </p>
  );
}
