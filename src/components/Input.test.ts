import { describe, it, expect } from 'vitest';

// normalizeInteger / normalizeDecimal은 컴포넌트 내부 함수이므로
// 동일 로직을 여기서 직접 테스트합니다 (UI 레이어와 분리)

function normalizeInteger(raw: string): string {
  const digits = raw.split('.')[0].replace(/[^0-9]/g, '');
  if (digits === '') return '';
  return String(Number(digits));
}

function normalizeDecimal(raw: string): string {
  let val = raw.replace(/[^0-9.]/g, '');
  const dotIdx = val.indexOf('.');
  if (dotIdx !== -1) {
    val = val.slice(0, dotIdx + 1) + val.slice(dotIdx + 1).replace(/\./g, '');
  }
  const [intPart, decPart] = val.split('.');
  const cleanInt = intPart.replace(/^0+/, '') || (decPart !== undefined ? '0' : '');
  return decPart !== undefined ? `${cleanInt}.${decPart}` : cleanInt;
}

describe('normalizeInteger', () => {
  it('숫자만 통과', () => expect(normalizeInteger('123')).toBe('123'));
  it('빈 값 유지', () => expect(normalizeInteger('')).toBe(''));
  it('소수점 제거 — 5.5 → 5 (정수 모드)', () => expect(normalizeInteger('5.5')).toBe('5'));
  it('15.5 → 15 (정수 모드, 155가 되면 안 됨)', () => expect(normalizeInteger('15.5')).toBe('15'));
  it('선행 0 제거', () => expect(normalizeInteger('007')).toBe('7'));
  it('문자 제거', () => expect(normalizeInteger('abc12')).toBe('12'));
  it('음수 기호 제거', () => expect(normalizeInteger('-5')).toBe('5'));
});

describe('normalizeDecimal', () => {
  it('정수 통과', () => expect(normalizeDecimal('5')).toBe('5'));
  it('소수 통과', () => expect(normalizeDecimal('5.5')).toBe('5.5'));
  it('15.5 → 15.5 (155가 되면 안 됨)', () => expect(normalizeDecimal('15.5')).toBe('15.5'));
  it('소수점 하나만 허용 — 5..5 → 5.5', () => expect(normalizeDecimal('5..5')).toBe('5.5'));
  it('소수점 두 개 — 1.2.3 → 1.23', () => expect(normalizeDecimal('1.2.3')).toBe('1.23'));
  it('빈 값 유지', () => expect(normalizeDecimal('')).toBe(''));
  it('선행 0 제거 — 007 → 7', () => expect(normalizeDecimal('007')).toBe('7'));
  it('0.5 유지 (0 제거하면 안 됨)', () => expect(normalizeDecimal('0.5')).toBe('0.5'));
  it('00.5 → 0.5', () => expect(normalizeDecimal('00.5')).toBe('0.5'));
  it('.5 → 0.5 (선행 소수점 정규화)', () => expect(normalizeDecimal('.5')).toBe('0.5'));
  it('음수 기호 제거', () => expect(normalizeDecimal('-1.5')).toBe('1.5'));
  it('문자 제거', () => expect(normalizeDecimal('abc1.5')).toBe('1.5'));
  it('소수점 입력 중 유지 — 5. 유지', () => expect(normalizeDecimal('5.')).toBe('5.'));
});
