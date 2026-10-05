/** 서버 rule-set.ts의 RULE_SET_VERSION과 같은 값 — 제도 수치를 바꿀 때 함께 갱신한다 */
export const RULE_SET_VERSION = 'KR-2026.10';

export interface RuleBasis {
  domain: string | null;
  effectiveDate: string;
  source: string;
  ruleVersion: string | null;
}

/** 저장된 시뮬레이션 결과에서 기준일·제도버전을 읽는다 — 이전에 저장된 결과는 null */
export function readRuleBasis(output: unknown): RuleBasis | null {
  if (!output || typeof output !== 'object') return null;
  const { basisDate, ruleVersion } = output as { basisDate?: unknown; ruleVersion?: unknown };
  if (!basisDate || typeof basisDate !== 'object') return null;
  const { domain, effectiveDate, source } = basisDate as Record<string, unknown>;
  if (typeof effectiveDate !== 'string' || typeof source !== 'string') return null;
  return {
    domain: typeof domain === 'string' ? domain : null,
    effectiveDate,
    source,
    ruleVersion: typeof ruleVersion === 'string' ? ruleVersion : null,
  };
}

/** 화면에 표시할 한 줄 문구 */
export function formatRuleBasis(basis: RuleBasis): string {
  const head = basis.domain ? `${basis.domain} 기준일 ${basis.effectiveDate}` : `기준일 ${basis.effectiveDate}`;
  const version = basis.ruleVersion ? ` · 규칙 ${basis.ruleVersion}` : '';
  return `${head}${version} (${basis.source})`;
}
