import { describe, it, expect, vi, beforeEach } from "vitest";

// client 모듈을 단순 객체로 mock — router.tsx 의존성 차단
vi.mock("./client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
  ApiError: class ApiError extends Error {
    errorCode: string;
    constructor(code: string) {
      super();
      this.errorCode = code;
    }
  },
}));

// isAxiosError를 쓰는 catch 분기 테스트를 위해 axios mock
vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    isAxiosError: (e: unknown) =>
      (e as Record<string, unknown>)?.isAxiosError === true,
  };
});

import client, { ApiError } from "./client";
import { getMe, googleSignInRequest } from "./auth-api";

const mockGet = client.get as ReturnType<typeof vi.fn>;
const mockPost = client.post as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe("getMe — GET /auth/me", () => {
  it("성공 시 /auth/me를 호출하고 사용자 정보를 반환한다", async () => {
    mockGet.mockResolvedValue({
      data: { data: { id: 1, email: "test@example.com", name: "테스트" } },
    });

    const result = await getMe();

    expect(mockGet).toHaveBeenCalledWith("/auth/me");
    expect(result).toEqual({
      id: 1,
      email: "test@example.com",
      name: "테스트",
    });
  });
});

describe("googleSignInRequest — POST /auth/google", () => {
  it("idToken으로 /auth/google 호출 후 token과 사용자 정보를 반환한다", async () => {
    mockPost.mockResolvedValue({
      data: {
        data: {
          id: 2,
          email: "google@example.com",
          name: "Google유저",
          token: "jwt-token",
        },
      },
    });

    const result = await googleSignInRequest("google-id-token");

    expect(mockPost).toHaveBeenCalledWith("/auth/google", {
      idToken: "google-id-token",
    });
    expect(result.token).toBe("jwt-token");
    expect(result.email).toBe("google@example.com");
  });

  it("서버 에러 시 ApiError를 던진다", async () => {
    const axiosError = Object.assign(new Error("axios error"), {
      isAxiosError: true,
      response: { data: { error: { code: "INVALID_GOOGLE_TOKEN" } } },
    });
    mockPost.mockRejectedValue(axiosError);

    await expect(googleSignInRequest("bad-token")).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
