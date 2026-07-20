import type { DiagnosisState, ProjectionResult } from '../domain/plan';

export interface WelcomeMetrics {
  averageMonthlyPension: number;
  completedDiagnoses: number;
  accuracyRate: number;
}

export interface LivingExpenseGuide {
  minimum: number;
  recommended: number;
}

export function getWelcomeMetrics(): WelcomeMetrics {
  return {
    averageMonthlyPension: 1870000,
    completedDiagnoses: 1240000,
    accuracyRate: 98,
  };
}

export function getLivingExpenseGuide(
  diagnosisType: string,
  householdSize: number,
): LivingExpenseGuide {
  if (diagnosisType === 'couple') {
    const guides: Record<number, LivingExpenseGuide> = {
      1: { minimum: 1500000, recommended: 2000000 },
      2: { minimum: 2000000, recommended: 2800000 },
      3: { minimum: 2500000, recommended: 3400000 },
      4: { minimum: 3000000, recommended: 4000000 },
      5: { minimum: 3500000, recommended: 4600000 },
    };
    return guides[householdSize] ?? guides[2];
  }
  return { minimum: 1200000, recommended: 1800000 };
}

export function calculateProjection(state: DiagnosisState): ProjectionResult {
  // 정년(retirementAge) 미지정 시 기본값 60세 — 정년 연장 정책 반영 시 state로 주입
  const retirementAge = state.retirementAge ?? 60;
  const pensionStartAge = getPensionStartAge(state.birthYear ?? null);
  // 퇴직 시점(60세)에 국민연금 개시 연령에 도달했을 때만 수입에 포함
  const nationalPensionAmount =
    pensionStartAge <= retirementAge ? state.pension.national : 0;

  const totalIncome =
    nationalPensionAmount + state.pension.retirement + state.pension.personal;
  const totalExpense =
    state.livingExpense.desiredMonthly +
    state.medicalExpense.healthInsurance +
    state.medicalExpense.privateInsurance;
  const gap = totalIncome - totalExpense;

  const incomeItems = [
    { label: '국민연금', amount: nationalPensionAmount },
    { label: '퇴직연금', amount: state.pension.retirement },
    { label: '개인연금', amount: state.pension.personal },
  ].filter((i) => i.amount > 0);

  const expenseItems = [
    { label: '생활비', amount: state.livingExpense.desiredMonthly },
    { label: '건강보험료', amount: state.medicalExpense.healthInsurance },
    { label: '민영보험료', amount: state.medicalExpense.privateInsurance },
  ].filter((i) => i.amount > 0);

  // 생활비 초과분(권장 생활비 대비)이 부족액에서 차지하는 비율을 실제 데이터로 산정
  // (권장 생활비 이내면 부족 원인을 전부 연금 수입 부족으로 귀속)
  const causeAnalysis = gap < 0 ? buildCauseAnalysis(state, -gap) : [];

  return {
    totalIncome,
    totalExpense,
    gap,
    incomeItems,
    expenseItems,
    causeAnalysis,
    simulations: [],
  };
}

// 부족액(shortfall) 중 "생활비 설정"(권장 생활비 초과분)이 설명하는 비율을 계산하고,
// 나머지를 "연금 수입 부족"으로 귀속한다. 두 가중치의 합은 항상 100.
function buildCauseAnalysis(
  state: DiagnosisState,
  shortfall: number,
): import('../domain/plan').CauseItem[] {
  const excessLivingExpense = Math.max(
    0,
    state.livingExpense.desiredMonthly - state.livingExpense.guideRecommended,
  );
  const livingExpenseWeight =
    shortfall > 0 ? Math.min(100, Math.round((excessLivingExpense / shortfall) * 100)) : 0;
  const pensionWeight = 100 - livingExpenseWeight;

  return [
    { cause: '연금 수입 부족', weight: pensionWeight },
    { cause: '생활비 설정', weight: livingExpenseWeight },
  ];
}

export interface YearlyProjection {
  year: number;
  age: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyGap: number;
  cumulativeGap: number;
  unemploymentBenefitIncome?: number;
  nationalPensionStarted: boolean;
}

function getPensionStartAge(birthYear: number | null): number {
  if (!birthYear) return 65;
  if (birthYear >= 1969) return 65;
  if (birthYear >= 1965) return 64;
  if (birthYear >= 1961) return 63;
  if (birthYear >= 1957) return 62;
  if (birthYear >= 1953) return 61;
  return 60;
}

export interface UnemploymentBenefitOption {
  monthlyAmount: number;
  durationMonths: number;
}

export function calculateLongTermProjection(
  state: DiagnosisState,
  years = 20,
  inflationRate = 0.02,
  pensionGrowthRate = 0.02,
  unemploymentBenefit?: UnemploymentBenefitOption,
): YearlyProjection[] {
  // 정년(retirementAge) 미지정 시 기본값 60세 — 정년 연장 정책 반영 시 state로 주입
  const retirementAge = state.retirementAge ?? 60;
  const pensionStartAge = getPensionStartAge(state.birthYear ?? null);
  const baseNational = state.pension.national;
  const baseOther = state.pension.retirement + state.pension.personal;
  const baseExpense =
    state.livingExpense.desiredMonthly +
    state.medicalExpense.healthInsurance +
    state.medicalExpense.privateInsurance;

  const result: YearlyProjection[] = [];
  let cumulative = 0;

  for (let i = 0; i < years; i++) {
    const age = retirementAge + i;
    const inflationFactor = Math.pow(1 + inflationRate, i);
    const pensionFactor = Math.pow(1 + pensionGrowthRate, i);

    // 국민연금은 출생연도별 수급 개시 연령부터만 포함
    const nationalPensionStarted = age >= pensionStartAge;
    const pensionStartIndex = pensionStartAge - retirementAge;
    const nationalIncome = nationalPensionStarted
      ? Math.round(baseNational * Math.pow(1 + pensionGrowthRate, i - pensionStartIndex))
      : 0;
    const otherIncome = Math.round(baseOther * pensionFactor);

    // 60세(i=0)에 실업급여를 연간 총액의 월평균으로 반영
    const ubIncome =
      unemploymentBenefit && i === 0
        ? Math.round(
            (unemploymentBenefit.monthlyAmount * unemploymentBenefit.durationMonths) / 12,
          )
        : 0;

    const monthlyIncome = nationalIncome + otherIncome + ubIncome;
    const monthlyExpense = Math.round(baseExpense * inflationFactor);
    const monthlyGap = monthlyIncome - monthlyExpense;
    cumulative += monthlyGap * 12;

    result.push({
      year: i + 1,
      age,
      monthlyIncome,
      monthlyExpense,
      monthlyGap,
      cumulativeGap: cumulative,
      nationalPensionStarted,
      ...(ubIncome > 0 ? { unemploymentBenefitIncome: ubIncome } : {}),
    });
  }
  return result;
}

export function generateRecommendations(
  state: DiagnosisState,
  twentyYearGap: number,
): import('../domain/plan').SimulationItem[] {
  const MONTHS = 240;
  // 퇴직 시점에 국민연금이 아직 개시되지 않았다면 추천 산정 기준에서 제외 (calculateProjection과 동일 규칙)
  const retirementAge = state.retirementAge ?? 60;
  const pensionStartAge = getPensionStartAge(state.birthYear ?? null);
  const nationalPensionAmount =
    pensionStartAge <= retirementAge ? state.pension.national : 0;
  const totalIncome =
    nationalPensionAmount + state.pension.retirement + state.pension.personal;
  const totalInsurance =
    state.medicalExpense.healthInsurance + state.medicalExpense.privateInsurance;
  const { desiredMonthly } = state.livingExpense;

  const isDeficit = twentyYearGap < 0;
  // 20년 갭을 월 단위로 환산 — 이 만큼을 월별로 개선해야 균형 달성
  const monthlyTarget = Math.abs(twentyYearGap) / MONTHS;
  // 5만원 단위로 올림, 최소 5만원
  const snap = (n: number) => Math.max(50000, Math.ceil(n / 50000) * 50000);
  const wan = (n: number) => Math.round(n / 10000);

  const items: import('../domain/plan').SimulationItem[] = [];

  // 생활비 절감 (적자 시: 갭의 50%를 생활비로 메움, 최대 25% 절감)
  if (desiredMonthly > 0) {
    const delta = isDeficit
      ? snap(Math.min(monthlyTarget * 0.5, desiredMonthly * 0.25))
      : snap(desiredMonthly * 0.1);
    items.push({
      label: isDeficit ? `생활비 월 ${wan(delta)}만원 절감` : `생활비 월 ${wan(delta)}만원 절감 가능`,
      delta,
      twentyYearImpact: delta * MONTHS,
    });
  }

  // 연금 수입 증가 (적자 시: 갭의 50%를 연금으로 메움, 최대 30% 증가)
  if (totalIncome > 0) {
    const delta = isDeficit
      ? snap(Math.min(monthlyTarget * 0.5, totalIncome * 0.3))
      : snap(totalIncome * 0.1);
    items.push({
      label: isDeficit ? `연금 수입 월 ${wan(delta)}만원 증가` : `연금 수입 월 ${wan(delta)}만원 추가 여력`,
      delta,
      twentyYearImpact: delta * MONTHS,
    });
  }

  // 보험료 절감 (보험료가 있을 때만, 15% 절감 목표, 입력 합산 초과 불가)
  if (totalInsurance > 0) {
    const delta = Math.min(snap(Math.min(totalInsurance * 0.15, 200000)), totalInsurance);
    items.push({
      label: `보험료 월 ${wan(delta)}만원 절감`,
      delta,
      twentyYearImpact: delta * MONTHS,
    });
  }

  return items;
}
