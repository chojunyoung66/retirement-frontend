import { isAxiosError } from "axios";
import z from "zod";
import client, { ApiError } from "./client";

const userProfileSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  // 구버전 BE는 hasPassword 없음 — 없으면 비밀번호 확인 UI로 폴백
  hasPassword: z.boolean().optional().default(true),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export type DeleteAccountRequest =
  | { password: string }
  | { emailConfirm: string; phrase: string };

export const WITHDRAWAL_PHRASE = "탈퇴합니다";

/** 로그인 사용자 프로필 (탈퇴 UI 분기용 hasPassword 포함) */
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const res = await client.get("/users/me");
    const parsed = userProfileSchema.safeParse(res.data.data);
    if (!parsed.success) throw new Error("유효하지 않은 응답 형식입니다");
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    }
    throw err;
  }
};

/** 계정 탈퇴 — 서버가 쿠키도 삭제 */
export const deleteAccountRequest = async (
  body: DeleteAccountRequest,
): Promise<void> => {
  try {
    await client.delete("/users/me", { data: body });
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      if (!err.response) throw new ApiError("NETWORK_ERROR");
      throw new ApiError(
        err.response.data?.error?.code || "UNKNOWN_ERROR",
        err.response.status,
      );
    }
    throw err;
  }
};
