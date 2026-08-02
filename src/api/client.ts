import axios, { type InternalAxiosRequestConfig } from 'axios';
import store from '../store/store';
import { signOut } from '../store/auth-slice';
import { router } from '../router';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
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
      console.error(`[API] 401 Unauthorized - ${method} ${url}`);
      const { authStatus } = store.getState().auth;
      // 쿠키 세션이 살아 있던 경우만 강제 로그아웃
      if (authStatus === 'authenticated') {
        store.dispatch(signOut());
        router.navigate('/signin', {
          state: { from: window.location.pathname },
          replace: true,
        });
      }
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
