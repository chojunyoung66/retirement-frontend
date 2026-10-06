import { isAxiosError } from 'axios';
import z from 'zod';
import client, { ApiError } from './client';
import { scenarioTypeSchema, type ScenarioType } from './withdrawal-scenario-api';

const paymentConfigSchema = z.object({
  enabled: z.boolean(),
  price: z.number().int().positive(),
});

const reportOrderSchema = z.object({
  orderId: z.string().min(6),
  amount: z.number().int().positive(),
  orderName: z.string(),
});

const confirmResultSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  scenarioType: scenarioTypeSchema,
  method: z.string().nullable(),
  reportId: z.number().nullable(),
});

export type PaymentConfig = z.infer<typeof paymentConfigSchema>;
export type ReportOrder = z.infer<typeof reportOrderSchema>;
export type ConfirmResult = z.infer<typeof confirmResultSchema>;

const parseOrThrow = <T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, data: unknown): T => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error('유효하지 않은 응답 형식입니다');
  return parsed.data;
};

const toApiError = (err: unknown): unknown => {
  if (!isAxiosError(err)) return err;
  if (!err.response) return new ApiError('NETWORK_ERROR');
  return new ApiError(err.response.data?.error?.code || 'UNKNOWN_ERROR', err.response.status);
};

export const parsePaymentConfig = (data: unknown): PaymentConfig => parseOrThrow(paymentConfigSchema, data);
export const parseReportOrder = (data: unknown): ReportOrder => parseOrThrow(reportOrderSchema, data);
export const parseConfirmResult = (data: unknown): ConfirmResult => parseOrThrow(confirmResultSchema, data);

// 리포트 가격·유료 여부 — 금액은 서버 설정값만 쓴다
export const getPaymentConfig = async (): Promise<PaymentConfig> => {
  try {
    const res = await client.get('/payments/config');
    return parsePaymentConfig(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

export const createReportOrder = async (
  scenarioSetId: number,
  scenarioType: ScenarioType,
): Promise<ReportOrder> => {
  try {
    const res = await client.post('/payments/report-orders', { scenarioSetId, scenarioType });
    return parseReportOrder(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

// 승인은 결제사 호출과 리포트 생성까지 포함해 오래 걸릴 수 있다
export const confirmPayment = async (input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<ConfirmResult> => {
  try {
    const res = await client.post('/payments/confirm', input, { timeout: 90_000 });
    return parseConfirmResult(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

export const reportPaymentFailure = async (orderId: string, code: string): Promise<void> => {
  try {
    await client.post('/payments/fail', { orderId, code });
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

/** 결제창이 successUrl로 붙여 주는 쿼리 — 값이 빠졌거나 금액이 숫자가 아니면 null */
export const readPaymentSuccessQuery = (
  search: string,
): { paymentKey: string; orderId: string; amount: number } | null => {
  const params = new URLSearchParams(search);
  const paymentKey = params.get('paymentKey');
  const orderId = params.get('orderId');
  const amount = Number(params.get('amount'));
  if (!paymentKey || !orderId || !Number.isSafeInteger(amount) || amount <= 0) return null;
  return { paymentKey, orderId, amount };
};

/** 결제창 실패 쿼리 — 메시지는 결제사가 보낸 안내 문구라 그대로 보여 준다 */
export const readPaymentFailQuery = (
  search: string,
): { code: string; message: string; orderId: string | null } => {
  const params = new URLSearchParams(search);
  const rawCode = params.get('code') ?? 'UNKNOWN';
  return {
    code: /^[A-Za-z0-9_]{1,100}$/.test(rawCode) ? rawCode : 'UNKNOWN',
    message: (params.get('message') ?? '').slice(0, 200),
    orderId: params.get('orderId'),
  };
};
