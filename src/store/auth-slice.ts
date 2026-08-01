import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// TODO: P1에서 body token / localStorage 제거 — 현재는 HttpOnly 쿠키와 병행
const STORAGE_KEY = "retirement_token";

function loadToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

interface AuthUser {
  id: number;
  email: string;
  name: string;
}

interface AuthState {
  token: string | null;
  authStatus: "checking" | "authenticated" | "unauthenticated";
  user: AuthUser | null;
}

// 쿠키 세션 가능성을 위해 항상 checking으로 시작 후 checkAuth가 확정
const initialState: AuthState = {
  token: loadToken(),
  authStatus: "checking",
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    signIn(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.authStatus = "authenticated";
      try {
        localStorage.setItem(STORAGE_KEY, action.payload.token);
      } catch {
        /* 스토리지 쓰기 실패 무시 */
      }
    },
    signOut(state) {
      state.token = null;
      state.user = null;
      state.authStatus = "unauthenticated";
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* 스토리지 삭제 실패 무시 */
      }
    },
    // checkAuth 결과 반영: authenticated → user 저장, unauthenticated → 토큰 제거
    setAuthStatus(
      state,
      action: PayloadAction<{
        status: "authenticated" | "unauthenticated";
        user?: AuthUser;
      }>,
    ) {
      state.authStatus = action.payload.status;
      if (action.payload.status === "authenticated" && action.payload.user) {
        state.user = action.payload.user;
      } else {
        state.token = null;
        state.user = null;
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
    },
  },
});

export const { signIn, signOut, setAuthStatus } = authSlice.actions;
export default authSlice.reducer;
