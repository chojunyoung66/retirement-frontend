import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../store/store";
import { signIn, signOut, setAuthStatus } from "../store/auth-slice";
import store from "../store/store";
import {
  signInRequest,
  signUpRequest,
  getMe,
  googleSignInRequest,
  type SignInRequest,
  type SignUpRequest,
} from "../api/auth-api";
import { ApiError } from "../api/client";

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((s: RootState) => s.auth.token);
  const user = useSelector((s: RootState) => s.auth.user);
  const authStatus = useSelector((s: RootState) => s.auth.authStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인
  const login = useCallback(
    async (data: SignInRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await signInRequest(data);
        dispatch(
          signIn({
            token: result.token,
            user: { id: result.id, email: result.email, name: result.name },
          }),
        );
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? `인증 실패: ${err.errorCode}`
            : "로그인 중 오류가 발생했습니다";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch],
  );

  // 회원가입
  const signup = useCallback(
    async (data: SignUpRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await signUpRequest(data);
        dispatch(
          signIn({
            token: result.token,
            user: { id: result.id, email: result.email, name: result.name },
          }),
        );
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? `회원가입 실패: ${err.errorCode}`
            : "회원가입 중 오류가 발생했습니다";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch],
  );

  // 로그아웃
  const logout = useCallback(() => {
    dispatch(signOut());
    setError(null);
  }, [dispatch]);

  // 앱 시작 시 저장된 토큰 유효성 확인
  const checkAuth = useCallback(async () => {
    const currentToken = store.getState().auth.token;
    if (!currentToken) {
      dispatch(setAuthStatus({ status: "unauthenticated" }));
      return;
    }
    try {
      const profile = await getMe();
      dispatch(setAuthStatus({ status: "authenticated", user: profile }));
    } catch {
      // 토큰 만료 또는 네트워크 오류 → 인증 해제
      dispatch(setAuthStatus({ status: "unauthenticated" }));
    }
  }, [dispatch]);

  // Google 로그인
  const googleLogin = useCallback(
    async (idToken: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await googleSignInRequest(idToken);
        dispatch(
          signIn({
            token: result.token,
            user: { id: result.id, email: result.email, name: result.name },
          }),
        );
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? `구글 로그인 실패: ${err.errorCode}`
            : "구글 로그인 중 오류가 발생했습니다";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch],
  );

  return {
    token,
    user,
    isLoggedIn: !!token,
    authStatus,
    isLoading,
    error,
    login,
    signup,
    logout,
    checkAuth,
    googleLogin,
  };
}
