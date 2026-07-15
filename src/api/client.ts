import axios, { type InternalAxiosRequestConfig } from 'axios';
import store from '../store/store';
import { signOut } from '../store/auth-slice';

const client = axios.create({
  baseURL: 'https://retirement-backend-1.onrender.com/api',
});

// 요청 인터셉터: Authorization 헤더에 토큰 추가
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = store.getState().auth.token;
  const method = config.method?.toUpperCase();
  const url = config.url;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`[API] ${method} ${url} - Token attached (${token.substring(0, 20)}...)`);
  } else {
    console.warn(`[API] ${method} ${url} - No token available`);
  }

  return config;
});

// 응답 인터셉터: 에러 로깅
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const config = error.config;
    const method = config?.method?.toUpperCase();
    const url = config?.url;

    if (status === 401) {
      console.error(`[API] 401 Unauthorized - ${method} ${url}`);
      console.error('[API] 401 Response:', error.response?.data);
      const hasToken = !!store.getState().auth.token;
      if (hasToken) {
        // 토큰 만료 또는 무효 → 자동 로그아웃 후 현재 경로 보존하여 로그인 페이지로 이동
        store.dispatch(signOut());
        const returnTo = encodeURIComponent(window.location.pathname);
        window.location.href = `/signin?returnTo=${returnTo}`;
      }
      // 토큰 없는 401 (로그인 실패 등)은 에러를 그대로 전파
    } else if (status === 403) {
      console.error(`[API] 403 Forbidden - ${method} ${url}`);
    }

    return Promise.reject(error);
  }
);

export class ApiError extends Error {
  errorCode: string;

  constructor(errorCode: string) {
    super();
    this.errorCode = errorCode;
  }
}

export default client;
