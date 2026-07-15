import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { hideToast } from '../store/toast-slice';

export default function Toast() {
  const message = useSelector((s: RootState) => s.toast.message);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => dispatch(hideToast()), 3000);
    return () => window.clearTimeout(id);
  }, [message, dispatch]);

  if (!message) return null;

  return (
    <div className="toast-container">
      <div className="toast">{message}</div>
    </div>
  );
}
