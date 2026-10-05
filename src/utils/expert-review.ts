/** 외부 검토 요청 폼 주소 — http(s)만 허용하고, 없거나 잘못되면 버튼을 숨긴다 */
export function resolveExpertReviewUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
