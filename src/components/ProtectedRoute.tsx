import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, authStatus } = useAuth();
  const location = useLocation();

  // 토큰 유효성 확인 중 — 즉시 리다이렉트 금지
  if (authStatus === "checking") {
    return (
      <div className="screen-content">
        <div className="card">
          <div className="card-subtitle" style={{ textAlign: "center" }}>
            인증 확인 중...
          </div>
        </div>
      </div>
    );
  }

  return isLoggedIn ? (
    <>{children}</>
  ) : (
    <Navigate to="/signin" state={{ from: location.pathname }} replace />
  );
}
