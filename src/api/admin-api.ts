import z from 'zod';
import client from './client';
import {
  executionItemSchema,
  executionProgressSchema,
  reviewRequestSchema,
  reviewStatusSchema,
  toApiError,
  type ReviewStatus,
} from './concierge-api';
import { reportContentSchema } from './report-api';
import { scenarioTypeSchema } from './withdrawal-scenario-api';

export const PAYMENT_STATUSES = ['READY', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED'] as const;
const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

const adminReviewRecordSchema = reviewRequestSchema.extend({
  userId: z.number(),
  operatorNote: z.string().nullable(),
});

const adminReviewSummarySchema = adminReviewRecordSchema.extend({
  userEmail: z.string(),
  reportTitle: z.string().nullable(),
  scenarioType: scenarioTypeSchema,
  reportGeneratedAt: z.string(),
});

const adminReviewDetailSchema = z.object({
  request: adminReviewRecordSchema.extend({ userEmail: z.string().nullable() }),
  report: z.object({
    id: z.number(),
    title: z.string().nullable(),
    scenarioType: scenarioTypeSchema,
    ruleVersion: z.string(),
    generatedAt: z.string(),
    content: reportContentSchema,
  }),
  executionPlan: z
    .object({
      startDate: z.string(),
      progress: executionProgressSchema,
      items: z.array(executionItemSchema),
    })
    .nullable(),
});

const adminPaymentSchema = z.object({
  id: z.number(),
  orderId: z.string(),
  userId: z.number().nullable(),
  userEmail: z.string().nullable(),
  product: z.string(),
  amount: z.number(),
  status: paymentStatusSchema,
  scenarioType: scenarioTypeSchema,
  method: z.string().nullable(),
  approvedAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  cancelReason: z.string().nullable(),
  receiptUrl: z.string().nullable(),
  failureCode: z.string().nullable(),
  consumedAt: z.string().nullable(),
  reportId: z.number().nullable(),
  reportDownloadedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type AdminReviewRecord = z.infer<typeof adminReviewRecordSchema>;
export type AdminReviewSummary = z.infer<typeof adminReviewSummarySchema>;
export type AdminReviewDetail = z.infer<typeof adminReviewDetailSchema>;
export type AdminPayment = z.infer<typeof adminPaymentSchema>;

const parseOrThrow = <T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, data: unknown): T => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error('유효하지 않은 응답 형식입니다');
  return parsed.data;
};

export const parseAdminReviewDetail = (data: unknown): AdminReviewDetail =>
  parseOrThrow(adminReviewDetailSchema, data);
export const parseAdminPayments = (data: unknown): AdminPayment[] =>
  parseOrThrow(z.array(adminPaymentSchema), data);

export const listAdminReviews = async (status?: ReviewStatus): Promise<AdminReviewSummary[]> => {
  try {
    const res = await client.get('/admin/review-requests', { params: status ? { status } : {} });
    return parseOrThrow(z.array(adminReviewSummarySchema), res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

export const getAdminReview = async (id: number): Promise<AdminReviewDetail> => {
  try {
    const res = await client.get(`/admin/review-requests/${id}`);
    return parseAdminReviewDetail(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

export const updateAdminReview = async (
  id: number,
  input: { status?: ReviewStatus; answer?: string | null; operatorNote?: string | null },
): Promise<AdminReviewRecord> => {
  try {
    const res = await client.patch(`/admin/review-requests/${id}`, input);
    return parseOrThrow(adminReviewRecordSchema, res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

export const listAdminPayments = async (status?: PaymentStatus): Promise<AdminPayment[]> => {
  try {
    const res = await client.get('/admin/payments', { params: status ? { status } : {} });
    return parseAdminPayments(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

export const refundAdminPayment = async (id: number, reason: string): Promise<AdminPayment> => {
  try {
    const res = await client.post(`/admin/payments/${id}/refund`, { reason });
    return parseOrThrow(adminPaymentSchema, res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

export { reviewStatusSchema };
