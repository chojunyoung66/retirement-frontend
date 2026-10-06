import { useEffect, useState, type ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { getMe } from '../api/auth-api';
import { useAuth } from '../hooks/useAuth';
import { setAuthStatus } from '../store/auth-slice';
import type { AppDispatch } from '../store/store';
import ProtectedRoute from './ProtectedRoute';

/** 운영자 화면 — 역할을 모르면(로그인 직후) /auth/me로 한 번 확인한다. 서버도 운영자만 응답한다 */
function OperatorGate({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const [failed, setFailed] = useState(false);
  const role = user?.role;

  useEffect(() => {
    if (role !== undefined) return;
    let active = true;
    getMe()
      .then((profile) => {
        if (active) dispatch(setAuthStatus({ status: 'authenticated', user: profile }));
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [role, dispatch]);

  if (role === 'OPERATOR') return <>{children}</>;

  if (role === undefined && !failed) {
    return (
      <div className="screen-content">
        <div className="card card-subtitle" style={{ textAlign: 'center' }}>
          권한 확인 중...
        </div>
      </div>
    );
  }

  return (
    <div className="screen-content">
      <div className="card" style={{ textAlign: 'center' }}>
        <p className="card-subtitle">운영자만 볼 수 있는 화면이에요.</p>
        <Link to="/">처음 화면으로</Link>
      </div>
    </div>
  );
}

export default function OperatorRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <OperatorGate>{children}</OperatorGate>
    </ProtectedRoute>
  );
}
