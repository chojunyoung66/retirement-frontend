import type { ExecutionItem, ReviewStatus } from '../api/concierge-api';

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  REQUESTED: '접수됨',
  IN_REVIEW: '검토 중',
  ANSWERED: '답변 완료',
  CLOSED: '종료',
  CANCELED: '취소됨',
};

/** 사용자 화면의 진행 단계 (접수 → 검토 중 → 답변) — 취소는 단계에서 뺀다 */
export const REVIEW_STEPS: readonly ReviewStatus[] = ['REQUESTED', 'IN_REVIEW', 'ANSWERED'];

export function reviewStepIndex(status: ReviewStatus): number {
  if (status === 'CLOSED') return REVIEW_STEPS.length - 1;
  return REVIEW_STEPS.indexOf(status);
}

export const isActiveReview = (status: ReviewStatus): boolean =>
  status === 'REQUESTED' || status === 'IN_REVIEW';

export interface ExecutionWeek {
  week: number;
  startDay: number;
  endDay: number;
  items: ExecutionItem[];
}

/** 마감일 기준 주차별로 묶는다 (1주차 = D1~D7). 항목이 없는 주는 뺀다 */
export function groupItemsByWeek(items: ExecutionItem[]): ExecutionWeek[] {
  const weeks = new Map<number, ExecutionItem[]>();
  for (const item of [...items].sort((a, b) => a.dueDay - b.dueDay)) {
    const week = Math.max(1, Math.ceil(item.dueDay / 7));
    weeks.set(week, [...(weeks.get(week) ?? []), item]);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, weekItems]) => ({
      week,
      startDay: (week - 1) * 7 + 1,
      endDay: week * 7,
      items: weekItems,
    }));
}

/** 시작일을 1일째로 센 마감 날짜 (M월 D일) */
export function dueDateLabel(startDateIso: string, dueDay: number): string {
  const start = new Date(startDateIso);
  if (Number.isNaN(start.getTime())) return `D${dueDay}`;
  const due = new Date(start.getTime() + (dueDay - 1) * 24 * 60 * 60 * 1000);
  return `${due.getMonth() + 1}월 ${due.getDate()}일`;
}

export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}
