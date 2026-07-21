import { isAxiosError } from 'axios';
import z from 'zod';
import client, { ApiError } from './client';

// 회원가입 요청 스키마
const signUpReqSchema = z.object({
  email: z.string().email('유효하지 않은 이메일입니다'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  name: z.string().min(1, '이름은 필수입니다'),
});

// 회원가입 응답 스키마
const signUpResSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  token: z.string(),
});

// 로그인 요청 스키마
const signInReqSchema = z.object({
  email: z.string().email('유효하지 않은 이메일입니다'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
});

// 로그인 응답 스키마
const signInResSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  token: z.string(),
});

export type SignUpRequest = z.infer<typeof signUpReqSchema>;
export type SignUpResponse = z.infer<typeof signUpResSchema>;
export type SignInRequest = z.infer<typeof signInReqSchema>;
export type SignInResponse = z.infer<typeof signInResSchema>;

// 회원가입 API 요청
export const signUpRequest = async (
  data: SignUpRequest
): Promise<SignUpResponse> => {
  try {
    const parsedReq = signUpReqSchema.safeParse(data);
    if (!parsedReq.success) {
      throw new ApiError('VALIDATION_ERROR');
    }

    const res = await client.post('/auth/signup', parsedReq.data);

    const parsed = signUpResSchema.safeParse(res.data.data);
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

// 로그인 API 요청
export const signInRequest = async (
  data: SignInRequest
): Promise<SignInResponse> => {
  try {
    const parsedReq = signInReqSchema.safeParse(data);
    if (!parsedReq.success) {
      throw new ApiError('VALIDATION_ERROR');
    }

    const res = await client.post('/auth/signin', parsedReq.data);

    const parsed = signInResSchema.safeParse(res.data.data);
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

// 사용자 프로필 조회
export const getMe = async () => {
  try {
    const res = await client.get('/users/me');
    return res.data.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || 'UNKNOWN_ERROR');
    }
    throw err;
  }
};
