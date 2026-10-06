import { isAxiosError } from 'axios';
import z from 'zod';
import client, { ApiError } from './client';

export const REVIEW_STATUSES = ['REQUESTED', 'IN_REVIEW', 'ANSWERED', 'CLOSED', 'CANCELED'] as const;
export const reviewStatusSchema = z.enum(REVIEW_STATUSES);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const REVIEW_QUESTION_MIN = 5;
export const REVIEW_QUESTION_MAX = 1000;

const reviewRequestSchema = z.object({
  id: z.number(),
  reportId: z.number(),
  question: z.string(),
  consentAt: z.string(),
  status: reviewStatusSchema,
  answer: z.string().nullable(),
  answeredAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const executionItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  dueDay: z.number().int(),
  doneAt: z.string().nullable(),
});

export const executionProgressSchema = z.object({
  done: z.number().int(),
  total: z.number().int(),
  currentDay: z.number().int(),
});

const executionPlanSchema = z.object({
  id: z.number(),
  reportId: z.number(),
  startDate: z.string(),
  items: z.array(executionItemSchema),
  progress: executionProgressSchema,
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type ExecutionItem = z.infer<typeof executionItemSchema>;
export type ExecutionProgress = z.infer<typeof executionProgressSchema>;
export type ExecutionPlan = z.infer<typeof executionPlanSchema>;
export { executionItemSchema, reviewRequestSchema };

const parseOrThrow = <T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, data: unknown): T => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error('유효하지 않은 응답 형식입니다');
  return parsed.data;
};

export const toApiError = (err: unknown): unknown => {
  if (!isAxiosError(err)) return err;
  if (!err.response) return new ApiError('NETWORK_ERROR');
  return new ApiError(err.response.data?.error?.code || 'UNKNOWN_ERROR', err.response.status);
};

export const parseReviewRequest = (data: unknown): ReviewRequest => parseOrThrow(reviewRequestSchema, data);
export const parseExecutionPlan = (data: unknown): ExecutionPlan => parseOrThrow(executionPlanSchema, data);

// ---- 검토 요청 ----

export const createReviewRequest = async (input: {
  reportId: number;
  question: string;
  consent: true;
}): Promise<ReviewRequest> => {
  try {
    const res = await client.post('/review-requests', input);
    return parseReviewRequest(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

export const getMyReviewRequests = async (): Promise<ReviewRequest[]> => {
  try {
    const res = await client.get('/review-requests');
    return parseOrThrow(z.array(reviewRequestSchema), res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

export const cancelReviewRequest = async (id: number): Promise<ReviewRequest> => {
  try {
    const res = await client.delete(`/review-requests/${id}`);
    return parseReviewRequest(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

// ---- 100일 실행 ----

export const startExecutionPlan = async (reportId: number): Promise<ExecutionPlan> => {
  try {
    const res = await client.post(`/reports/${reportId}/execution-plan`);
    return parseExecutionPlan(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

/** 아직 시작하지 않았으면 null */
export const getExecutionPlan = async (reportId: number): Promise<ExecutionPlan | null> => {
  try {
    const res = await client.get(`/reports/${reportId}/execution-plan`);
    return parseExecutionPlan(res.data.data);
  } catch (err: unknown) {
    const apiErr = toApiError(err);
    if (apiErr instanceof ApiError && apiErr.errorCode === 'EXECUTION_PLAN_NOT_FOUND') return null;
    throw apiErr;
  }
};

export const setExecutionItemDone = async (
  planId: number,
  key: string,
  done: boolean,
): Promise<ExecutionPlan> => {
  try {
    const res = await client.patch(`/execution-plans/${planId}/items/${encodeURIComponent(key)}`, { done });
    return parseExecutionPlan(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};
