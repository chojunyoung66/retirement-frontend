import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// TODO: 운영 환경에서는 서버의 HttpOnly/Secure/SameSite 쿠키 방식으로 전환 권장
//       (XSS로 인한 토큰 탈취를 방지하려면 JS 접근 불가 쿠키가 더 안전)
const STORAGE_KEY = 'retirement_token';

function loadToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
}

const initialState: AuthState = { token: loadToken() };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signIn(state, action: PayloadAction<string>) {
      state.token = action.payload;
      try { localStorage.setItem(STORAGE_KEY, action.payload); } catch { /* 스토리지 쓰기 실패 무시 */ }
    },
    signOut(state) {
      state.token = null;
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* 스토리지 삭제 실패 무시 */ }
    },
  },
});

export const { signIn, signOut } = authSlice.actions;
export default authSlice.reducer;
