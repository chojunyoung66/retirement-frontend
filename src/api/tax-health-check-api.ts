import { isAxiosError } from 'axios';
import z from 'zod';
import client, { ApiError } from './client';
import { basisDateSchema } from './withdrawal-scenario-api';

const won = z.number().int().nonnegative();

const taxHealthCheckReqSchema = z.object({
  publicPensionAnnual: won,
  laborIncome: won,
  businessIncome: won,
  financialIncome: won,
  otherIncome: won,
  propertyValue: won.nullable(),
  carValue: won,
  actualMonthlyPremium: won.nullable(),
  spouseAnnualIncome: won.nullable(),
});

const taxHealthCheckResultSchema = z.object({
  dependent: z.object({
    status: z.enum(['LIKELY', 'CAUTION', 'CHECK_NEEDED']),
    statusLabel: z.string(),
    reasons: z.array(z.object({ code: z.string(), label: z.string() })),
    likelyFails: z.boolean(),
  }),
  premium: z.object({
    estimatedMonthly: z.number(),
    incomePremium: z.number(),
    propertyPremium: z.number(),
    carPremium: z.number(),
    longTermCarePremium: z.number(),
    actualMonthly: z.number().nullable(),
    differenceMonthly: z.number().nullable(),
    comparison: z.enum(['ESTIMATE_ONLY', 'SIMILAR', 'ACTUAL_HIGHER', 'ACTUAL_LOWER']),
  }),
  financialIncome: z.object({ amount: z.number(), countedInFull: z.boolean() }),
  checklist: z.array(z.string()),
  basisDate: basisDateSchema,
  ruleVersion: z.string(),
  notices: z.array(z.string()),
});

export type TaxHealthCheckRequest = z.infer<typeof taxHealthCheckReqSchema>;
export type TaxHealthCheckResult = z.infer<typeof taxHealthCheckResultSchema>;

export const parseTaxHealthCheckResult = (data: unknown): TaxHealthCheckResult => {
  const parsed = taxHealthCheckResultSchema.safeParse(data);
  if (!parsed.success) throw new Error('유효하지 않은 응답 형식입니다');
  return parsed.data;
};

// 세금·건보 체크 — 서버는 입력값을 저장하지 않는다
export const runTaxHealthCheck = async (
  data: TaxHealthCheckRequest,
): Promise<TaxHealthCheckResult> => {
  try {
    const parsedReq = taxHealthCheckReqSchema.safeParse(data);
    if (!parsedReq.success) throw new ApiError('VALIDATION_ERROR');
    const res = await client.post('/tax-health-check', parsedReq.data);
    return parseTaxHealthCheckResult(res.data.data);
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || 'UNKNOWN_ERROR', err.response?.status);
    }
    throw err;
  }
};
