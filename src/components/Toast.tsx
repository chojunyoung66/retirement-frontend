import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { hideToast } from '../store/toast-slice';

export default function Toast() {
  const { message, persistent } = useSelector((s: RootState) => s.toast);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!message || persistent) return;
    const id = window.setTimeout(() => dispatch(hideToast()), 3000);
    return () => window.clearTimeout(id);
  }, [message, persistent, dispatch]);

  if (!message) return null;

  return (
    <div className="toast-container">
      <div className="toast">{message}</div>
    </div>
  );
}
