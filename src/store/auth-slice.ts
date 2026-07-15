import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
}

const initialState: AuthState = { token: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signIn(state, action: PayloadAction<string>) {
      state.token = action.payload;
    },
    signOut(state) {
      state.token = null;
    },
  },
});

export const { signIn, signOut } = authSlice.actions;
export default authSlice.reducer;
