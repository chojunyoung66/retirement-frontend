import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { signIn, signOut } from '../store/auth-slice';
import { signInRequest, signUpRequest, type SignInRequest, type SignUpRequest } from '../api/auth-api';
import { ApiError } from '../api/client';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((s: RootState) => s.auth.token);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인
  const login = useCallback(
    async (data: SignInRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await signInRequest(data);
        dispatch(signIn(result.token));
        return result;
      } catch (err) {
        const message = err instanceof ApiError
          ? `인증 실패: ${err.errorCode}`
          : '로그인 중 오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch]
  );

  // 회원가입
  const signup = useCallback(
    async (data: SignUpRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await signUpRequest(data);
        dispatch(signIn(result.token));
        return result;
      } catch (err) {
        const message = err instanceof ApiError
          ? `회원가입 실패: ${err.errorCode}`
          : '회원가입 중 오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch]
  );

  // 로그아웃
  const logout = useCallback(() => {
    dispatch(signOut());
    setError(null);
  }, [dispatch]);

  return {
    token,
    isLoggedIn: !!token,
    isLoading,
    error,
    login,
    signup,
    logout,
  };
}
