import { isAxiosError } from "axios";
import z from "zod";
import client, { ApiError } from "./client";

/** Axios 오류를 ApiError로 변환 — 네트워크/HTTP status 구분 */
function throwApiError(err: unknown): never {
  if (isAxiosError(err)) {
    if (!err.response) {
      throw new ApiError("NETWORK_ERROR");
    }
    throw new ApiError(
      err.response.data?.error?.code || "UNKNOWN_ERROR",
      err.response.status,
    );
  }
  throw err;
}

const PASSWORD_MAX = 72;

// 회원가입 요청 스키마
const signUpReqSchema = z.object({
  email: z.string().email("유효하지 않은 이메일입니다"),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .max(PASSWORD_MAX, "비밀번호는 72자 이하여야 합니다"),
  name: z.string().min(1, "이름은 필수입니다"),
});

// 회원가입 응답 스키마 (JWT는 HttpOnly 쿠키로만 전달)
const signUpResSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
});

// 로그인 요청 스키마
const signInReqSchema = z.object({
  email: z.string().email("유효하지 않은 이메일입니다"),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .max(PASSWORD_MAX, "비밀번호는 72자 이하여야 합니다"),
});

// 로그인 응답 스키마
const signInResSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
});

export type SignUpRequest = z.infer<typeof signUpReqSchema>;
export type SignUpResponse = z.infer<typeof signUpResSchema>;
export type SignInRequest = z.infer<typeof signInReqSchema>;
export type SignInResponse = z.infer<typeof signInResSchema>;

// 회원가입 API 요청
export const signUpRequest = async (
  data: SignUpRequest,
): Promise<SignUpResponse> => {
  try {
    const parsedReq = signUpReqSchema.safeParse(data);
    if (!parsedReq.success) {
      throw new ApiError("VALIDATION_ERROR");
    }

    const res = await client.post("/auth/signup", parsedReq.data);

    const parsed = signUpResSchema.safeParse(res.data.data);
    if (!parsed.success) {
      throw new Error("유효하지 않은 응답 형식입니다");
    }

    return parsed.data;
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throwApiError(err);
  }
};

// 로그인 API 요청
export const signInRequest = async (
  data: SignInRequest,
): Promise<SignInResponse> => {
  try {
    const parsedReq = signInReqSchema.safeParse(data);
    if (!parsedReq.success) {
      throw new ApiError("VALIDATION_ERROR");
    }

    const res = await client.post("/auth/signin", parsedReq.data);

    const parsed = signInResSchema.safeParse(res.data.data);
    if (!parsed.success) {
      throw new Error("유효하지 않은 응답 형식입니다");
    }

    return parsed.data;
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throwApiError(err);
  }
};

// 사용자 프로필 조회
export const getMe = async () => {
  try {
    const res = await client.get("/auth/me");
    return res.data.data;
  } catch (err: unknown) {
    throwApiError(err);
  }
};

// Google 로그인 응답 스키마
const googleSignInResSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  profileImage: z.string().optional(),
});

export type GoogleSignInResponse = z.infer<typeof googleSignInResSchema>;

// Google ID Token으로 로그인
export const googleSignInRequest = async (
  idToken: string,
): Promise<GoogleSignInResponse> => {
  try {
    const res = await client.post("/auth/google", { idToken });
    const parsed = googleSignInResSchema.safeParse(res.data.data);
    if (!parsed.success) throw new Error("유효하지 않은 응답 형식입니다");
    return parsed.data;
  } catch (err: unknown) {
    throwApiError(err);
  }
};

// 기존 계정에 Google 연결 (비밀번호 재인증)
export const linkGoogleAccountRequest = async (
  idToken: string,
  password: string,
): Promise<GoogleSignInResponse> => {
  try {
    const res = await client.post("/auth/google/link", { idToken, password });
    const parsed = googleSignInResSchema.safeParse(res.data.data);
    if (!parsed.success) throw new Error("유효하지 않은 응답 형식입니다");
    return parsed.data;
  } catch (err: unknown) {
    throwApiError(err);
  }
};

// 로그아웃 — 서버 HttpOnly 쿠키 삭제
export const logoutRequest = async (): Promise<void> => {
  try {
    await client.post("/auth/logout");
  } catch (err: unknown) {
    throwApiError(err);
  }
};
