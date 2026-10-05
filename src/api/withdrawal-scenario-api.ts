import { isAxiosError } from 'axios';
import z from 'zod';
import client, { ApiError } from './client';

export const SCENARIO_TYPES = ['A', 'B', 'C', 'D'] as const;
export const scenarioTypeSchema = z.enum(SCENARIO_TYPES);
const valueSourceSchema = z.enum(['request', 'simulation', 'default', 'none']);
const dependentStatusSchema = z.enum(['LIKELY', 'CAUTION', 'CHECK_NEEDED']);

export const planItemSchema = z.object({
  accountId: z.number().nullable(),
  accountType: z.string(),
  label: z.string(),
  priority: z.number(),
  actionType: z.enum(['LUMP_SUM', 'ANNUITY', 'AS_NEEDED', 'HOLD', 'INCOME']),
  startYm: z.string().nullable(),
  endYm: z.string().nullable(),
  monthlyGross: z.number(),
  monthlyNet: z.number(),
  totalGross: z.number(),
  totalTax: z.number(),
  method: z.string(),
  taxNote: z.string(),
  healthInsuranceNote: z.string(),
  cautions: z.array(z.string()),
});

const yearRowSchema = z.object({
  year: z.number(),
  age: z.number(),
  expense: z.number(),
  nationalPension: z.number(),
  unemployment: z.number(),
  grossWithdrawal: z.number(),
  tax: z.number(),
  netWithdrawal: z.number(),
  shortfall: z.number(),
  endingBalance: z.number(),
  financialIncome: z.number(),
  dependentStatus: dependentStatusSchema,
});

export const summarySchema = z.object({
  grossWithdrawal: z.number(),
  totalTax: z.number(),
  netWithdrawal: z.number(),
  depletionAge: z.number().nullable(),
  shortfallMonths: z.number(),
  firstShortfallYm: z.string().nullable(),
  dependentLikelyYears: z.number(),
  endingBalance: z.number(),
});

export const scenarioBaseSchema = z.object({
  type: scenarioTypeSchema,
  title: z.string(),
  goal: z.string(),
  recommended: z.boolean(),
  priorityOrder: z.array(z.string()),
  summary: summarySchema,
  planItems: z.array(planItemSchema),
  yearly: z.array(yearRowSchema),
  notes: z.array(z.string()),
});

const monthlySchema = z.object({
  ym: z.array(z.string()),
  gross: z.array(z.number()),
  tax: z.array(z.number()),
  shortfall: z.array(z.number()),
  balance: z.array(z.number()),
});

export const basisDateSchema = z.object({
  domain: z.string(),
  effectiveDate: z.string(),
  source: z.string(),
});

export const accountCheckSchema = z.object({
  accountId: z.number(),
  accountType: z.string(),
  label: z.string(),
  nonDeductibleStatus: z.enum(['CONFIRMED', 'CHECK_NEEDED', 'NOT_APPLICABLE']),
  unknownAmount: z.number(),
});

export const assumptionsSchema = z.object({
  inflationRate: z.number(),
  pensionGrowthRate: z.number(),
  returnRate: z.number(),
  financialYieldRate: z.number(),
  endAge: z.number(),
});

export const inputSummarySchema = z.object({
  accountsCount: z.number(),
  totalBalance: z.number(),
  nationalPensionSource: valueSourceSchema,
  unemploymentSource: valueSourceSchema,
  yearsOfServiceSource: valueSourceSchema,
  propertyProvided: z.boolean(),
});

const scenarioSetSchema = z.object({
  id: z.number(),
  ruleVersion: z.string(),
  selectedType: scenarioTypeSchema.nullable(),
  createdAt: z.string(),
  result: z.object({
    ruleVersion: z.string(),
    basisDates: z.array(basisDateSchema),
    startYm: z.string(),
    endYm: z.string(),
    assumptions: assumptionsSchema,
    recommendedType: scenarioTypeSchema,
    recommendationNote: z.string(),
    inputSummary: inputSummarySchema,
    accountChecks: z.array(accountCheckSchema),
    scenarios: z.array(scenarioBaseSchema),
    disclaimers: z.array(z.string()),
  }),
});

const scenarioPlanSchema = z.object({
  setId: z.number(),
  ruleVersion: z.string(),
  selectedType: scenarioTypeSchema.nullable(),
  createdAt: z.string(),
  basisDates: z.array(basisDateSchema),
  startYm: z.string(),
  endYm: z.string(),
  recommendedType: scenarioTypeSchema,
  accountChecks: z.array(accountCheckSchema),
  disclaimers: z.array(z.string()),
  scenario: scenarioBaseSchema.extend({ monthly: monthlySchema }),
});

const generateReqSchema = z.object({
  nationalPension: z
    .object({
      monthlyAmount: z.number().int().nonnegative(),
      startAge: z.number().int(),
    })
    .optional(),
  unemployment: z
    .object({ monthlyAmount: z.number().int().nonnegative(), months: z.number().int() })
    .nullable()
    .optional(),
  yearsOfService: z.number().positive().optional(),
  propertyValue: z.number().int().nonnegative().nullable().optional(),
  assumptions: z
    .object({
      inflationRate: z.number(),
      pensionGrowthRate: z.number(),
      returnRate: z.number(),
      financialYieldRate: z.number(),
    })
    .partial()
    .optional(),
});

export type ScenarioType = z.infer<typeof scenarioTypeSchema>;
export type ValueSource = z.infer<typeof valueSourceSchema>;
export type DependentStatus = z.infer<typeof dependentStatusSchema>;
export type PlanItem = z.infer<typeof planItemSchema>;
export type YearRow = z.infer<typeof yearRowSchema>;
export type ScenarioSummary = z.infer<typeof summarySchema>;
export type ScenarioCard = z.infer<typeof scenarioBaseSchema>;
export type ScenarioSet = z.infer<typeof scenarioSetSchema>;
export type ScenarioPlan = z.infer<typeof scenarioPlanSchema>;
export type GenerateScenarioRequest = z.infer<typeof generateReqSchema>;

export const isScenarioType = (value: unknown): value is ScenarioType =>
  scenarioTypeSchema.safeParse(value).success;

const toApiError = (err: unknown): unknown =>
  isAxiosError(err)
    ? new ApiError(err.response?.data?.error?.code || 'UNKNOWN_ERROR', err.response?.status)
    : err;

const parseOrThrow = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error('유효하지 않은 응답 형식입니다');
  return parsed.data;
};

export const parseScenarioSet = (data: unknown): ScenarioSet =>
  parseOrThrow(scenarioSetSchema, data);

export const parseScenarioPlan = (data: unknown): ScenarioPlan =>
  parseOrThrow(scenarioPlanSchema, data);

// 시나리오 생성 (가정값은 모두 선택)
export const generateWithdrawalScenarios = async (
  data: GenerateScenarioRequest,
): Promise<ScenarioSet> => {
  try {
    const parsedReq = generateReqSchema.safeParse(data);
    if (!parsedReq.success) throw new ApiError('VALIDATION_ERROR');
    const res = await client.post('/withdrawal-scenarios/generate', parsedReq.data);
    return parseScenarioSet(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

// 최근 시나리오 세트 (없으면 null)
export const getLatestWithdrawalScenarios = async (): Promise<ScenarioSet | null> => {
  try {
    const res = await client.get('/withdrawal-scenarios/latest');
    if (res.data.data === null) return null;
    return parseScenarioSet(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

// 시나리오별 계좌 실행안
export const getWithdrawalPlan = async (
  setId: number,
  type: ScenarioType,
): Promise<ScenarioPlan> => {
  try {
    const res = await client.get(`/withdrawal-scenarios/${setId}/plans/${type}`);
    return parseScenarioPlan(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

// 선택한 시나리오 저장
export const selectWithdrawalScenario = async (
  setId: number,
  selectedType: ScenarioType,
): Promise<void> => {
  try {
    await client.patch(`/withdrawal-scenarios/${setId}/selection`, { selectedType });
  } catch (err: unknown) {
    throw toApiError(err);
  }
};
