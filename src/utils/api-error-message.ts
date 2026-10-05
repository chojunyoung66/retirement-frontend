const INPUT_ERROR_CODES = new Set(['INVALID_REQUEST', 'VALIDATION_ERROR', 'INVALID_UPDATE', 'INVALID_JSON']);
const AUTH_ERROR_CODES = new Set(['UNAUTHORIZED', 'SESSION_EXPIRED', 'INVALID_TOKEN']);
const SPECIFIC_MESSAGES: Record<string, string> = {
  ACCOUNT_ASSET_LIMIT: '계좌는 최대 20개까지 등록할 수 있어요',
  ACCOUNT_ASSET_BUCKET_EXCEEDS_BALANCE: '과세구분 금액의 합계가 잔액보다 클 수 없어요',
  ACCOUNT_ASSET_FIELD_NOT_ALLOWED: '선택한 계좌 유형에 맞지 않는 항목이 있어요',
  DIAGNOSIS_REQUIRED: '노후 진단을 먼저 완료해 주세요',
  ACCOUNT_ASSETS_REQUIRED: '계좌 자산을 1개 이상 입력해 주세요',
  REPORT_NOT_FOUND: '리포트를 찾을 수 없어요. 삭제되었을 수 있어요',
};

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
  if (SPECIFIC_MESSAGES[errorCode]) return SPECIFIC_MESSAGES[errorCode];
  if (INPUT_ERROR_CODES.has(errorCode)) return '입력값을 다시 확인해 주세요';
  if (AUTH_ERROR_CODES.has(errorCode)) return '로그인이 필요해요';
  if (errorCode === 'NOT_FOUND' || errorCode.endsWith('_NOT_FOUND')) {
    return '요청한 정보를 찾을 수 없어요';
  }
  return fallback;
}
