import { isAxiosError } from 'axios';
import z from 'zod';
import client, { ApiError } from './client';

// 포트폴리오 항목 스키마
const portfolioItemSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  allocation: z.number(),
});

// 포트폴리오 데이터 스키마
const portfolioSchema = z.object({
  id: z.number(),
  userId: z.number(),
  accountType: z.string(),
  name: z.string(),
  items: z.array(portfolioItemSchema),
});

// 생성 요청 스키마
const createPortfolioReqSchema = z.object({
  accountType: z.string(),
  name: z.string(),
  items: z.array(portfolioItemSchema),
});

// 업데이트 요청 스키마
const updatePortfolioReqSchema = createPortfolioReqSchema.partial();

export type PortfolioItem = z.infer<typeof portfolioItemSchema>;
export type Portfolio = z.infer<typeof portfolioSchema>;
export type CreatePortfolioRequest = z.infer<typeof createPortfolioReqSchema>;
export type UpdatePortfolioRequest = z.infer<typeof updatePortfolioReqSchema>;

// 포트폴리오 생성
export const createPortfolio = async (
  data: CreatePortfolioRequest
): Promise<Portfolio> => {
  try {
    const res = await client.post('/pension-portfolios', data);
    const parsed = portfolioSchema.safeParse(res.data.data);
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

// 포트폴리오 목록 조회
export const getPortfolios = async (): Promise<Portfolio[]> => {
  try {
    const res = await client.get('/pension-portfolios');
    const parsed = z.array(portfolioSchema).safeParse(res.data.data);
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

// 포트폴리오 단건 조회
export const getPortfolio = async (id: number): Promise<Portfolio> => {
  try {
    const res = await client.get(`/pension-portfolios/${id}`);
    const parsed = portfolioSchema.safeParse(res.data.data);
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

// 포트폴리오 업데이트
export const updatePortfolio = async (
  id: number,
  data: UpdatePortfolioRequest
): Promise<Portfolio> => {
  try {
    const res = await client.patch(`/pension-portfolios/${id}`, data);
    const parsed = portfolioSchema.safeParse(res.data.data);
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

// 포트폴리오 삭제
export const deletePortfolio = async (id: number): Promise<void> => {
  try {
    await client.delete(`/pension-portfolios/${id}`);
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || 'UNKNOWN_ERROR');
    }
    throw err;
  }
};
