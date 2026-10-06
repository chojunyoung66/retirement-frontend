const INPUT_ERROR_CODES = new Set(['INVALID_REQUEST', 'VALIDATION_ERROR', 'INVALID_UPDATE', 'INVALID_JSON']);
const AUTH_ERROR_CODES = new Set(['UNAUTHORIZED', 'SESSION_EXPIRED', 'INVALID_TOKEN']);
const SPECIFIC_MESSAGES: Record<string, string> = {
  ACCOUNT_ASSET_LIMIT: '계좌는 최대 20개까지 등록할 수 있어요',
  ACCOUNT_ASSET_BUCKET_EXCEEDS_BALANCE: '과세구분 금액의 합계가 잔액보다 클 수 없어요',
  ACCOUNT_ASSET_FIELD_NOT_ALLOWED: '선택한 계좌 유형에 맞지 않는 항목이 있어요',
  DIAGNOSIS_REQUIRED: '노후 진단을 먼저 완료해 주세요',
  ACCOUNT_ASSETS_REQUIRED: '계좌 자산을 1개 이상 입력해 주세요',
  REPORT_NOT_FOUND: '리포트를 찾을 수 없어요. 삭제되었을 수 있어요',
  CONSENT_REQUIRED: '계좌 잔액·과세구분 저장에 동의해 주세요',
  REPORT_LIMIT: '리포트는 최대 50개까지 보관할 수 있어요. 필요 없는 리포트를 지운 뒤 다시 시도해 주세요',
  PAYMENT_REQUIRED: '결제를 마친 뒤 리포트를 만들 수 있어요',
  PAYMENT_DISABLED: '지금은 결제 없이 리포트를 만들 수 있어요. 화면을 새로고침해 주세요',
  PAYMENT_NOT_FOUND: '주문을 찾을 수 없어요. 실행안 화면에서 다시 시도해 주세요',
  PAYMENT_FORBIDDEN: '이 주문에 접근할 수 없어요',
  PAYMENT_ORDER_MISMATCH: '주문한 실행안과 다른 실행안이에요. 다시 결제해 주세요',
  PAYMENT_AMOUNT_MISMATCH: '결제 금액이 주문 금액과 달라 승인하지 않았어요',
  PAYMENT_NOT_PAYABLE: '이미 처리된 주문이에요. 리포트 목록을 확인해 주세요',
  PAYMENT_CONFLICT: '이미 다른 결제로 처리된 주문이에요',
  PAYMENT_REJECTED: '결제가 승인되지 않았어요. 다른 결제수단으로 다시 시도해 주세요',
  PAYMENT_APPROVAL_MISMATCH: '결제 정보가 주문과 달라 자동으로 취소했어요',
  PAYMENT_GATEWAY_UNAVAILABLE: '결제사 응답이 늦어요. 잠시 후 다시 시도해 주세요',
  PAYMENT_NOT_REFUNDABLE: '환불할 수 있는 결제가 아니에요',
  PAYMENT_REFUND_REJECTED: '결제사가 환불을 거절했어요. 결제사 관리자 화면에서 확인해 주세요',
  REVIEW_CONSENT_REQUIRED: '운영자가 리포트를 보는 것에 동의해 주세요',
  REVIEW_ALREADY_REQUESTED: '이 리포트는 이미 검토를 요청했어요',
  REVIEW_LIMIT: '진행 중인 검토 요청은 3건까지예요. 답변을 받은 뒤 다시 요청해 주세요',
  REVIEW_NOT_CANCELABLE: '이미 답변했거나 닫힌 요청이라 취소할 수 없어요',
  REVIEW_CANCELED: '사용자가 취소한 요청이에요',
  EXECUTION_PLAN_NOT_FOUND: '아직 100일 실행을 시작하지 않았어요',
  OPERATOR_ONLY: '운영자만 볼 수 있는 화면이에요',
  TOO_MANY_REQUESTS: '요청이 많아요. 잠시 후 다시 시도해 주세요',
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
