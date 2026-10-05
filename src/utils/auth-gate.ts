/** 기능 버튼에서 로그인 화면으로 보낼 때의 이유 — 로그인 화면 배너·배치를 바꾼다 */
export const AUTH_GATE_REASONS = ["scenarios", "save_result"] as const;
export type AuthGateReason = (typeof AUTH_GATE_REASONS)[number];

export const AUTH_GATE_COPY: Record<AuthGateReason, { title: string; body: string }> = {
  scenarios: {
    title: "로그인하면 4개 인출 시나리오로 바로 이어져요",
    body: "지금 진단을 저장해 두고 계좌만 입력하면 비교할 수 있어요",
  },
  save_result: {
    title: "로그인하면 이 결과를 저장해요",
    body: "다음에 와도 다시 입력하지 않아도 돼요",
  },
};

const isAuthGateReason = (value: unknown): value is AuthGateReason =>
  typeof value === "string" && (AUTH_GATE_REASONS as readonly string[]).includes(value);

/** location.state의 reason이 허용 값일 때만 */
export function resolveAuthGateReason(state: unknown): AuthGateReason | null {
  if (!state || typeof state !== "object") return null;
  const reason = (state as { reason?: unknown }).reason;
  return isAuthGateReason(reason) ? reason : null;
}

/** 보호 화면에 직접 들어왔을 때 경로로 이유를 추론 */
export function reasonFromPath(path: string): AuthGateReason | null {
  if (
    path === "/account-assets" ||
    path.startsWith("/withdrawal-") ||
    path.startsWith("/report/")
  ) {
    return "scenarios";
  }
  return null;
}
