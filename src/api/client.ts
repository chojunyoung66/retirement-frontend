import axios, { type InternalAxiosRequestConfig } from "axios";
import store from "../store/store";
import { signOut } from "../store/auth-slice";
import { router } from "../router";
import { clearClientRetirementSession } from "../utils/pension-draft";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  withCredentials: true,
});

// 요청은 HttpOnly 쿠키만 전달 (Authorization 헤더 미사용)
client.interceptors.request.use((config: InternalAxiosRequestConfig) => config);

// 응답 인터셉터: 에러 처리
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const config = error.config;
    const method = config?.method?.toUpperCase();
    const url = config?.url;

    if (status === 401) {
      const errorCode = error.response?.data?.error?.code as string | undefined;
      // 이미 로그인된 상태의 재인증 실패(틀린 비밀번호)는 세션 만료가 아님
      if (errorCode === "INVALID_CREDENTIALS") {
        return Promise.reject(error);
      }

      const { authStatus } = store.getState().auth;
      // 부트 checkAuth(/auth/me)의 비로그인 401은 정상 — 로그 생략
      if (authStatus === "authenticated") {
        console.error(`[API] 401 Unauthorized - ${method} ${url}`);
        clearClientRetirementSession();
        store.dispatch(signOut());
        router.navigate("/signin", {
          state: { from: window.location.pathname },
          replace: true,
        });
      }
    } else if (status === 403) {
      console.error(`[API] 403 Forbidden - ${method} ${url}`);
    }

    return Promise.reject(error);
  },
);

export class ApiError extends Error {
  errorCode: string;
  httpStatus?: number;

  constructor(errorCode: string, httpStatus?: number) {
    super();
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
  }
}

export default client;
