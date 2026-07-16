import { isAxiosError } from 'axios';
import z from 'zod';
import client, { ApiError } from './client';

// 정년 목표 데이터 스키마
const retirementGoalSchema = z.object({
  id: z.number(),
  birthYear: z.number(),
  retirementYear: z.number(),
  monthlyLivingExpense: z.number(),
  nationalPension: z.number(),
  retirementAsset: z.number(),
});

// 생성 요청 스키마
const createRetirementGoalReqSchema = z.object({
  birthYear: z.number(),
  retirementYear: z.number(),
  monthlyLivingExpense: z.number(),
  nationalPension: z.number(),
  retirementAsset: z.number(),
});

// 업데이트 요청 스키마
const updateRetirementGoalReqSchema = createRetirementGoalReqSchema.partial();

export type RetirementGoal = z.infer<typeof retirementGoalSchema>;
export type CreateRetirementGoalRequest = z.infer<typeof createRetirementGoalReqSchema>;
export type UpdateRetirementGoalRequest = z.infer<typeof updateRetirementGoalReqSchema>;

// 정년 목표 생성
export const createRetirementGoal = async (
  data: CreateRetirementGoalRequest
): Promise<RetirementGoal> => {
  try {
    const res = await client.post('/retirement-goals', data);
    const parsed = retirementGoalSchema.safeParse(res.data.data);
    if (!parsed.success) {
      throw new Error('유효하지 않은 응답 형식입니다');
    }
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || 'UNKNOWN_ERROR');
    }
    throw err;
  }
};

// 정년 목표 조회
export const getRetirementGoal = async (): Promise<RetirementGoal> => {
  try {
    const res = await client.get('/retirement-goals/me');
    const parsed = retirementGoalSchema.safeParse(res.data.data);
    if (!parsed.success) {
      throw new Error('유효하지 않은 응답 형식입니다');
    }
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || 'UNKNOWN_ERROR');
    }
    throw err;
  }
};

// 정년 목표 업데이트
export const updateRetirementGoal = async (
  data: UpdateRetirementGoalRequest
): Promise<RetirementGoal> => {
  try {
    const res = await client.patch('/retirement-goals/me', data);
    const parsed = retirementGoalSchema.safeParse(res.data.data);
    if (!parsed.success) {
      throw new Error('유효하지 않은 응답 형식입니다');
    }
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || 'UNKNOWN_ERROR');
    }
    throw err;
  }
};

// 정년 목표 삭제
export const deleteRetirementGoal = async (): Promise<void> => {
  try {
    await client.delete('/retirement-goals/me');
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || 'UNKNOWN_ERROR');
    }
    throw err;
  }
};
