import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../store/store";
import { signIn, signOut, setAuthStatus } from "../store/auth-slice";
import {
  signInRequest,
  signUpRequest,
  getMe,
  googleSignInRequest,
  linkGoogleAccountRequest,
  logoutRequest,
  type SignInRequest,
  type SignUpRequest,
} from "../api/auth-api";
import { ApiError } from "../api/client";
import { clearClientRetirementSession } from "../utils/pension-draft";

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);
  const authStatus = useSelector((s: RootState) => s.auth.authStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인 — 서버가 HttpOnly 쿠키를 설정함
  const login = useCallback(
    async (data: SignInRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await signInRequest(data);
        dispatch(
          signIn({
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

  // 로그아웃 — 서버 HttpOnly 쿠키 삭제 후 로컬 상태·세션 초안 정리
  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // 네트워크 실패해도 클라이언트 세션은 종료
    }
    clearClientRetirementSession();
    dispatch(signOut());
    setError(null);
  }, [dispatch]);

  // 앱 시작 시 쿠키 세션 확인
  const checkAuth = useCallback(async () => {
    try {
      const profile = await getMe();
      dispatch(setAuthStatus({ status: "authenticated", user: profile }));
    } catch {
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

  // 기존 계정에 Google 연결 (비밀번호 재인증)
  const linkGoogleAccount = useCallback(
    async (idToken: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await linkGoogleAccountRequest(idToken, password);
        dispatch(
          signIn({
            user: { id: result.id, email: result.email, name: result.name },
          }),
        );
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? `Google 계정 연결 실패: ${err.errorCode}`
            : "Google 계정 연결 중 오류가 발생했습니다";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch],
  );

  return {
    user,
    isLoggedIn: authStatus === "authenticated",
    authStatus,
    isLoading,
    error,
    login,
    signup,
    logout,
    checkAuth,
    googleLogin,
    linkGoogleAccount,
  };
}
