import { isAxiosError } from "axios";
import z from "zod";
import client, { ApiError } from "./client";

const diagnosisRecordSchema = z.object({
  id: z.number(),
  userId: z.number(),
  householdType: z.string(),
  birthYear: z.number(),
  retirementYear: z.number(),
  monthlyIncome: z.number(),
  monthlyExpense: z.number(),
  updatedAt: z.string(),
});

const diagnosisDataSchema = z.object({
  householdType: z.string().min(1),
  birthYear: z.number().int().min(1900),
  retirementYear: z.number().int().min(1900),
  monthlyIncome: z.number().nonnegative(),
  monthlyExpense: z.number().nonnegative(),
});

export type DiagnosisRecord = z.infer<typeof diagnosisRecordSchema>;
export type DiagnosisData = z.infer<typeof diagnosisDataSchema>;

// 최신 진단 결과 조회 (없으면 null)
export const getLatestDiagnosis = async (): Promise<DiagnosisRecord | null> => {
  try {
    const res = await client.get("/diagnoses/me/latest");
    if (res.data.data === null) return null;
    const parsed = diagnosisRecordSchema.safeParse(res.data.data);
    if (!parsed.success) throw new Error("유효하지 않은 응답 형식입니다");
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    }
    throw err;
  }
};

// 진단 결과 저장 (upsert)
export const saveLatestDiagnosis = async (
  data: DiagnosisData,
): Promise<DiagnosisRecord> => {
  try {
    const parsedReq = diagnosisDataSchema.safeParse(data);
    if (!parsedReq.success) throw new ApiError("VALIDATION_ERROR");
    const res = await client.put("/diagnoses/me/latest", parsedReq.data);
    const parsed = diagnosisRecordSchema.safeParse(res.data.data);
    if (!parsed.success) throw new Error("유효하지 않은 응답 형식입니다");
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    }
    throw err;
  }
};

// 진단 결과 삭제
export const deleteLatestDiagnosis = async (): Promise<void> => {
  try {
    await client.delete("/diagnoses/me/latest");
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    }
    throw err;
  }
};
