import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ToastState {
  message: string | null;
}

const toastSlice = createSlice({
  name: 'toast',
  initialState: { message: null } as ToastState,
  reducers: {
    showToast(state, action: PayloadAction<string>) {
      state.message = action.payload;
    },
    hideToast(state) {
      state.message = null;
    },
  },
});

export const { showToast, hideToast } = toastSlice.actions;
export default toastSlice.reducer;
