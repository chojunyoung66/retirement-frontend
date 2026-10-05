import type { TaxHealthCheckRequest } from '../api/tax-health-check-api';

/** 화면 입력값 — 보험료는 원, 나머지는 연 만원 단위 문자열 */
export interface TaxHealthCheckForm {
  publicPensionWan: string;
  laborWan: string;
  businessWan: string;
  financialWan: string;
  otherWan: string;
  propertyWan: string;
  carWan: string;
  actualPremiumWon: string;
  spouseIncomeWan: string;
}

export const EMPTY_TAX_HEALTH_FORM: TaxHealthCheckForm = {
  publicPensionWan: '',
  laborWan: '',
  businessWan: '',
  financialWan: '',
  otherWan: '',
  propertyWan: '',
  carWan: '',
  actualPremiumWon: '',
  spouseIncomeWan: '',
};

const MAX_WAN = 10_000_000;

/** 빈 값은 null, 숫자가 아니거나 범위를 벗어나면 undefined */
export function parseAmount(value: string, unit: 'wan' | 'won'): number | null | undefined {
  const trimmed = value.replace(/,/g, '').trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  if (unit === 'wan') return n > MAX_WAN ? undefined : Math.round(n * 10_000);
  return n > 10_000_000 ? undefined : Math.round(n);
}

export type PremiumComparison = 'ESTIMATE_ONLY' | 'SIMILAR' | 'ACTUAL_HIGHER' | 'ACTUAL_LOWER';

/** 서버 tax-health-check와 같은 기준 — 추정치의 10% 이내면 비슷한 수준 */
export function comparePremium(estimated: number, actual: number | null): PremiumComparison {
  if (actual === null) return 'ESTIMATE_ONLY';
  const tolerance = Math.max(estimated * 0.1, 1);
  if (Math.abs(actual - estimated) <= tolerance) return 'SIMILAR';
  return actual > estimated ? 'ACTUAL_HIGHER' : 'ACTUAL_LOWER';
}

export const PREMIUM_COMPARISON_TEXT: Record<PremiumComparison, string> = {
  ESTIMATE_ONLY: '실제 고지 보험료를 입력하면 추정치와 비교해 드려요',
  SIMILAR: '실제 고지 보험료가 추정치와 비슷해요',
  ACTUAL_HIGHER: '실제 고지 보험료가 추정치보다 높아요. 재산·소득 반영 시점이나 누락된 소득이 있는지 확인하세요',
  ACTUAL_LOWER: '실제 고지 보험료가 추정치보다 낮아요. 경감·감면이나 이전 연도 소득 기준인지 확인하세요',
};

export type BuildResult =
  | { ok: true; request: TaxHealthCheckRequest }
  | { ok: false; field: keyof TaxHealthCheckForm };

/** 입력 폼을 요청 본문으로 바꾼다 — 재산·실제 보험료·배우자 소득은 비우면 미입력(null) */
export function buildTaxHealthCheckRequest(
  form: TaxHealthCheckForm,
  hasSpouse: boolean,
): BuildResult {
  const wanFields = [
    'publicPensionWan',
    'laborWan',
    'businessWan',
    'financialWan',
    'otherWan',
    'propertyWan',
    'carWan',
    'spouseIncomeWan',
  ] as const;
  const values: Partial<Record<keyof TaxHealthCheckForm, number | null>> = {};
  for (const field of wanFields) {
    const parsed = parseAmount(form[field], 'wan');
    if (parsed === undefined) return { ok: false, field };
    values[field] = parsed;
  }
  const premium = parseAmount(form.actualPremiumWon, 'won');
  if (premium === undefined) return { ok: false, field: 'actualPremiumWon' };

  return {
    ok: true,
    request: {
      publicPensionAnnual: values.publicPensionWan ?? 0,
      laborIncome: values.laborWan ?? 0,
      businessIncome: values.businessWan ?? 0,
      financialIncome: values.financialWan ?? 0,
      otherIncome: values.otherWan ?? 0,
      propertyValue: values.propertyWan ?? null,
      carValue: values.carWan ?? 0,
      actualMonthlyPremium: premium,
      spouseAnnualIncome: hasSpouse ? (values.spouseIncomeWan ?? 0) : null,
    },
  };
}
