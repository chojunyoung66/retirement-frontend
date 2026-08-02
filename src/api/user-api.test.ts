import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./client", () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    errorCode: string;
    constructor(code: string) {
      super();
      this.errorCode = code;
    }
  },
}));

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    isAxiosError: (e: unknown) =>
      (e as Record<string, unknown>)?.isAxiosError === true,
  };
});

import client, { ApiError } from "./client";
import {
  deleteAccountRequest,
  getUserProfile,
  WITHDRAWAL_PHRASE,
} from "./user-api";

const mockGet = client.get as ReturnType<typeof vi.fn>;
const mockDelete = client.delete as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe("getUserProfile — GET /users/me", () => {
  it("프로필과 hasPassword를 반환한다", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          id: 1,
          email: "a@b.com",
          name: "테스터",
          hasPassword: true,
        },
      },
    });

    const result = await getUserProfile();
    expect(mockGet).toHaveBeenCalledWith("/users/me");
    expect(result.hasPassword).toBe(true);
  });
});

describe("deleteAccountRequest — DELETE /users/me", () => {
  it("비밀번호로 탈퇴를 요청한다", async () => {
    mockDelete.mockResolvedValue({ data: { success: true, data: null } });
    await deleteAccountRequest({ password: "password12" });
    expect(mockDelete).toHaveBeenCalledWith("/users/me", {
      data: { password: "password12" },
    });
  });

  it("Google-only 확인 문구로 탈퇴를 요청한다", async () => {
    mockDelete.mockResolvedValue({ data: { success: true, data: null } });
    await deleteAccountRequest({
      emailConfirm: "g@example.com",
      phrase: WITHDRAWAL_PHRASE,
    });
    expect(mockDelete).toHaveBeenCalledWith("/users/me", {
      data: {
        emailConfirm: "g@example.com",
        phrase: WITHDRAWAL_PHRASE,
      },
    });
  });

  it("서버 에러 시 ApiError", async () => {
    const axiosError = Object.assign(new Error("axios"), {
      isAxiosError: true,
      response: { data: { error: { code: "INVALID_CREDENTIALS" } } },
    });
    mockDelete.mockRejectedValue(axiosError);
    await expect(
      deleteAccountRequest({ password: "x" }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
