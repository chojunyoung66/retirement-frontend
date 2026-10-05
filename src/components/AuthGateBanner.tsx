import { AUTH_GATE_COPY, type AuthGateReason } from "../utils/auth-gate";

/** 기능 버튼에서 넘어온 이유 — 토스트와 달리 로그인·가입 화면에 계속 보인다 */
export default function AuthGateBanner({ reason }: { reason: AuthGateReason }) {
  const copy = AUTH_GATE_COPY[reason];
  return (
    <div
      className="card auth-gate-banner"
      role="note"
      style={{ background: "var(--primary-light)", borderColor: "var(--primary)" }}
    >
      <div className="card-title" style={{ marginBottom: 4 }}>
        {copy.title}
      </div>
      <p className="form-hint" style={{ margin: 0, fontSize: 13 }}>
        {copy.body}
      </p>
    </div>
  );
}
