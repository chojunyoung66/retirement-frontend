/** Render 콜드스타트 완화 — /health 로 백엔드 미리 깨움 */
export function warmBackend(): void {
  void fetch("/health", {
    method: "GET",
    credentials: "omit",
    cache: "no-store",
  }).catch(() => {
    // 실패해도 본 로그인 흐름에 영향 없음
  });
}
