import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import Button from "./Button";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, authStatus, checkAuth } = useAuth();
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

  // 네트워크/서버 오류 — 비로그인으로 튕기지 않고 재시도
  if (authStatus === "error") {
    return (
      <div className="screen-content">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="card-subtitle" style={{ marginBottom: 16 }}>
            서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.
          </div>
          <Button
            onClick={() => {
              void checkAuth();
            }}
          >
            다시 시도
          </Button>
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
