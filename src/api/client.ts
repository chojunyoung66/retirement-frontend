import axios, { type InternalAxiosRequestConfig } from 'axios';
import store from '../store/store';
import { signOut } from '../store/auth-slice';
import { router } from '../router';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
});

// 요청 인터셉터: Authorization 헤더에 토큰 추가
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 에러 처리
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const config = error.config;
    const method = config?.method?.toUpperCase();
    const url = config?.url;

    if (status === 401) {
      console.error(`[API] 401 Unauthorized - ${method} ${url}`);
      const hasToken = !!store.getState().auth.token;
      if (hasToken) {
        // 토큰 만료 → 상태 초기화 후 SPA 내비게이션으로 로그인 이동
        // window.location.href 대신 router.navigate를 사용해 하드 리로드 방지
        // state.from을 전달해 로그인 후 현재 경로로 복귀 가능 (SignInScreen이 처리)
        store.dispatch(signOut());
        router.navigate('/signin', {
          state: { from: window.location.pathname },
          replace: true,
        });
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
