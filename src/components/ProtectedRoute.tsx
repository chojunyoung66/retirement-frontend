import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  return isLoggedIn ? (
    <>{children}</>
  ) : (
    <Navigate to="/signin" state={{ from: location.pathname }} replace />
  );
}
