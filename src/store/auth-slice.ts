import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AuthUser {
  id: number;
  email: string;
  name: string;
}

interface AuthState {
  authStatus: "checking" | "authenticated" | "unauthenticated" | "error";
  user: AuthUser | null;
}

// P0 듀얼 모드 잔여 localStorage 토큰 제거 (마이그레이션)
try {
  localStorage.removeItem("retirement_token");
} catch {
  /* ignore */
}

// HttpOnly 쿠키 세션은 checkAuth(/auth/me)로만 확정
const initialState: AuthState = {
  authStatus: "checking",
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    signIn(state, action: PayloadAction<{ user: AuthUser }>) {
      state.user = action.payload.user;
      state.authStatus = "authenticated";
    },
    signOut(state) {
      state.user = null;
      state.authStatus = "unauthenticated";
    },
    // checkAuth 결과 반영
    setAuthStatus(
      state,
      action: PayloadAction<{
        status: "checking" | "authenticated" | "unauthenticated" | "error";
        user?: AuthUser;
      }>,
    ) {
      state.authStatus = action.payload.status;
      if (action.payload.status === "authenticated" && action.payload.user) {
        state.user = action.payload.user;
      } else if (action.payload.status === "unauthenticated") {
        state.user = null;
      }
    },
  },
});

export const { signIn, signOut, setAuthStatus } = authSlice.actions;
export default authSlice.reducer;
