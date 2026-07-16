import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ToastState {
  message: string | null;
  persistent: boolean;
}

const toastSlice = createSlice({
  name: 'toast',
  initialState: { message: null, persistent: false } as ToastState,
  reducers: {
    showToast(state, action: PayloadAction<string>) {
      state.message = action.payload;
      state.persistent = false;
    },
    showPersistentToast(state, action: PayloadAction<string>) {
      state.message = action.payload;
      state.persistent = true;
    },
    hideToast(state) {
      state.message = null;
      state.persistent = false;
    },
  },
});

export const { showToast, showPersistentToast, hideToast } = toastSlice.actions;
export default toastSlice.reducer;
