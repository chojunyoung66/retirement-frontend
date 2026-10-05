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

  // 라이브 영역은 항상 렌더링해야 메시지 삽입이 스크린 리더에 안내됨
  return (
    <div className="toast-container" role="status" aria-live="polite" aria-atomic="true">
      {message && <div className="toast">{message}</div>}
    </div>
  );
}
