import { isAxiosError } from 'axios';
import z from 'zod';
import client, { ApiError } from './client';
import {
  accountCheckSchema,
  assumptionsSchema,
  basisDateSchema,
  inputSummarySchema,
  planItemSchema,
  scenarioBaseSchema,
  scenarioTypeSchema,
  summarySchema,
  type ScenarioType,
} from './withdrawal-scenario-api';

const nextActionSchema = z.object({
  label: z.string(),
  actionType: planItemSchema.shape.actionType,
  startYm: z.string().nullable(),
  method: z.string(),
  monthlyNet: z.number(),
});

const reportContentSchema = z.object({
  title: z.string(),
  generatedAt: z.string(),
  ruleVersion: z.string(),
  basisDates: z.array(basisDateSchema),
  startYm: z.string(),
  endYm: z.string(),
  assumptions: assumptionsSchema,
  recommendedType: scenarioTypeSchema,
  recommendationNote: z.string(),
  inputSummary: inputSummarySchema,
  nextActions: z.array(nextActionSchema),
  comparison: z.array(
    z.object({
      type: scenarioTypeSchema,
      title: z.string(),
      recommended: z.boolean(),
      summary: summarySchema,
    }),
  ),
  scenario: scenarioBaseSchema,
  accountChecks: z.array(accountCheckSchema),
  disclaimers: z.array(z.string()),
});

const reportSummarySchema = z.object({
  id: z.number(),
  scenarioSetId: z.number().nullable(),
  scenarioType: scenarioTypeSchema,
  ruleVersion: z.string(),
  generatedAt: z.string(),
});

const reportSchema = reportSummarySchema.extend({ content: reportContentSchema });

export type ReportNextAction = z.infer<typeof nextActionSchema>;
export type ReportContent = z.infer<typeof reportContentSchema>;
export type ReportSummary = z.infer<typeof reportSummarySchema>;
export type Report = z.infer<typeof reportSchema>;

const parseOrThrow = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error('유효하지 않은 응답 형식입니다');
  return parsed.data;
};

export const parseReport = (data: unknown): Report => parseOrThrow(reportSchema, data);
export const parseReportList = (data: unknown): ReportSummary[] =>
  parseOrThrow(z.array(reportSummarySchema), data);

/** blob 응답의 오류 본문은 JSON 텍스트라 코드만 꺼낸다 */
export const errorCodeFromBlobBody = async (body: unknown): Promise<string> => {
  if (!(body instanceof Blob)) return 'UNKNOWN_ERROR';
  try {
    const parsed = JSON.parse(await body.text()) as { error?: { code?: unknown } };
    return typeof parsed.error?.code === 'string' ? parsed.error.code : 'UNKNOWN_ERROR';
  } catch {
    return 'UNKNOWN_ERROR';
  }
};

const toApiError = (err: unknown): unknown =>
  isAxiosError(err)
    ? new ApiError(err.response?.data?.error?.code || 'UNKNOWN_ERROR', err.response?.status)
    : err;

export const reportPdfFileName = (id: number): string => `retirement-plan-${id}.pdf`;

// 선택한 시나리오로 리포트 스냅샷 생성
export const createReport = async (
  scenarioSetId: number,
  scenarioType: ScenarioType,
): Promise<Report> => {
  try {
    const res = await client.post('/reports', { scenarioSetId, scenarioType });
    return parseReport(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

// 내 리포트 목록 (본문 없음)
export const getReports = async (): Promise<ReportSummary[]> => {
  try {
    const res = await client.get('/reports');
    return parseReportList(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

export const getReport = async (id: number): Promise<Report> => {
  try {
    const res = await client.get(`/reports/${id}`);
    return parseReport(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

export const deleteReport = async (id: number): Promise<void> => {
  try {
    await client.delete(`/reports/${id}`);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

// 서버에서 만든 PDF — 콜드스타트를 고려해 넉넉히 기다린다
export const downloadReportPdf = async (id: number): Promise<File> => {
  try {
    const res = await client.get<Blob>(`/reports/${id}/pdf`, {
      responseType: 'blob',
      timeout: 90_000,
    });
    return new File([res.data], reportPdfFileName(id), { type: 'application/pdf' });
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(await errorCodeFromBlobBody(err.response?.data), err.response?.status);
    }
    throw err;
  }
};
