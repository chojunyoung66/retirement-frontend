const INPUT_ERROR_CODES = new Set(['INVALID_REQUEST', 'VALIDATION_ERROR', 'INVALID_UPDATE', 'INVALID_JSON']);
const AUTH_ERROR_CODES = new Set(['UNAUTHORIZED', 'SESSION_EXPIRED', 'INVALID_TOKEN']);

// ApiError(errorCode) 형태만 인식 — client.ts의 store·router 의존을 끌어오지 않기 위함
const readErrorCode = (err: unknown): string | undefined => {
  if (!err || typeof err !== 'object') return undefined;
  const code = (err as { errorCode?: unknown }).errorCode;
  return typeof code === 'string' && code !== '' ? code : undefined;
};

/** 서버 에러 코드를 화면 문구로 변환 — 코드 원문은 노출하지 않음 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const errorCode = readErrorCode(err);
  if (!errorCode) return fallback;
  if (INPUT_ERROR_CODES.has(errorCode)) return '입력값을 다시 확인해 주세요';
  if (AUTH_ERROR_CODES.has(errorCode)) return '로그인이 필요해요';
  if (errorCode === 'NOT_FOUND' || errorCode.endsWith('_NOT_FOUND')) {
    return '요청한 정보를 찾을 수 없어요';
  }
  return fallback;
}
