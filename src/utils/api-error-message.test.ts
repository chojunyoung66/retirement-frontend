import { describe, it, expect } from 'vitest';
import { getApiErrorMessage } from './api-error-message';

const FALLBACK = '퇴직금 시뮬레이션 생성 중 오류가 발생했습니다';
const apiError = (errorCode: string) => Object.assign(new Error(), { errorCode });

describe('getApiErrorMessage', () => {
  it.each(['INVALID_REQUEST', 'VALIDATION_ERROR', 'INVALID_UPDATE'])(
    '%s는 입력값 확인 안내',
    (code) => expect(getApiErrorMessage(apiError(code), FALLBACK)).toBe('입력값을 다시 확인해 주세요'),
  );

  it.each(['UNAUTHORIZED', 'SESSION_EXPIRED', 'INVALID_TOKEN'])(
    '%s는 로그인 안내',
    (code) => expect(getApiErrorMessage(apiError(code), FALLBACK)).toBe('로그인이 필요해요'),
  );

  it('*_NOT_FOUND는 찾을 수 없음 안내', () => {
    expect(getApiErrorMessage(apiError('PORTFOLIO_NOT_FOUND'), FALLBACK)).toBe(
      '요청한 정보를 찾을 수 없어요',
    );
  });

  it('알 수 없는 코드는 기본 문구이며 코드 원문을 노출하지 않음', () => {
    const message = getApiErrorMessage(apiError('INTERNAL_SERVER_ERROR'), FALLBACK);
    expect(message).toBe(FALLBACK);
    expect(message).not.toContain('INTERNAL_SERVER_ERROR');
  });

  it('ApiError가 아닌 에러는 기본 문구', () => {
    expect(getApiErrorMessage(new Error('network'), FALLBACK)).toBe(FALLBACK);
    expect(getApiErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
  });
});
