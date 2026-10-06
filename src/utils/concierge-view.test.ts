import { describe, expect, it } from 'vitest';
import { dueDateLabel, groupItemsByWeek, isActiveReview, progressPercent, reviewStepIndex } from './concierge-view';
import { isWithinRefundPolicy } from './admin-view';

const item = (key: string, dueDay: number) => ({ key, label: key, dueDay, doneAt: null });

describe('groupItemsByWeek', () => {
  it('마감일로 주차를 나누고 빈 주는 뺀다', () => {
    const weeks = groupItemsByWeek([item('c', 30), item('a', 7), item('b', 8), item('d', 100)]);
    expect(weeks.map((w) => w.week)).toEqual([1, 2, 5, 15]);
    expect(weeks[0]).toMatchObject({ startDay: 1, endDay: 7 });
    expect(weeks[1].items.map((i) => i.key)).toEqual(['b']);
  });
});

describe('dueDateLabel', () => {
  it('시작일을 1일째로 센다', () => {
    expect(dueDateLabel('2026-10-06T03:00:00.000Z', 1)).toBe('10월 6일');
    expect(dueDateLabel('2026-10-06T03:00:00.000Z', 7)).toBe('10월 12일');
    expect(dueDateLabel('잘못된 날짜', 7)).toBe('D7');
  });
});

describe('검토 상태', () => {
  it('처리 중 상태와 단계를 구분한다', () => {
    expect(isActiveReview('REQUESTED')).toBe(true);
    expect(isActiveReview('ANSWERED')).toBe(false);
    expect(reviewStepIndex('IN_REVIEW')).toBe(1);
    expect(reviewStepIndex('CLOSED')).toBe(2);
    expect(reviewStepIndex('CANCELED')).toBe(-1);
  });

  it('진행률은 반올림한 백분율', () => {
    expect(progressPercent(1, 3)).toBe(33);
    expect(progressPercent(0, 0)).toBe(0);
  });
});

describe('isWithinRefundPolicy', () => {
  const now = new Date('2026-10-10T00:00:00.000Z');
  const paid = { status: 'PAID' as const, approvedAt: '2026-10-05T00:00:00.000Z', reportDownloadedAt: null };

  it('결제 후 7일 이내이고 받지 않았으면 환불 대상', () => {
    expect(isWithinRefundPolicy(paid, now)).toBe(true);
  });

  it('받았거나 7일이 지났거나 결제 완료가 아니면 아님', () => {
    expect(isWithinRefundPolicy({ ...paid, reportDownloadedAt: '2026-10-06T00:00:00.000Z' }, now)).toBe(false);
    expect(isWithinRefundPolicy({ ...paid, approvedAt: '2026-10-01T00:00:00.000Z' }, now)).toBe(false);
    expect(isWithinRefundPolicy({ ...paid, status: 'REFUNDED' }, now)).toBe(false);
  });
});
