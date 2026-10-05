import { describe, it, expect } from 'vitest';
import { formatAllocationTotal, limitAllocationDraft } from './allocation';
import { normalizeDecimal } from '../components/Input';

const typeAllocation = (raw: string) => limitAllocationDraft(normalizeDecimal(raw));

describe('limitAllocationDraft', () => {
  it('33.5를 그대로 유지 (335가 되면 안 됨)', () => expect(typeAllocation('33.5')).toBe('33.5'));
  it('입력 중인 "33." 유지', () => expect(typeAllocation('33.')).toBe('33.'));
  it('소수 셋째 자리부터 자름', () => expect(typeAllocation('12.345')).toBe('12.34'));
  it('100 초과는 100으로 제한', () => expect(typeAllocation('150')).toBe('100'));
  it('100.5도 100으로 제한', () => expect(typeAllocation('100.5')).toBe('100'));
  it('빈 값 유지', () => expect(typeAllocation('')).toBe(''));
  it('문자·음수 기호 제거', () => expect(typeAllocation('-2a0')).toBe('20'));
});

describe('formatAllocationTotal', () => {
  it('부동소수 오차를 숨김', () => expect(formatAllocationTotal(33.3 + 33.3 + 33.4)).toBe('100'));
  it('소수 합계 유지', () => expect(formatAllocationTotal(66.5)).toBe('66.5'));
});
