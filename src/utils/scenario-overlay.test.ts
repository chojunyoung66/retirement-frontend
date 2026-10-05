import { describe, expect, it } from 'vitest';
import type { ScenarioSet } from '../api/withdrawal-scenario-api';
import { buildScenarioOverlay, monthsInYear } from './scenario-overlay';

const row = (year: number, age: number, netWithdrawal: number, shortfall = 0) => ({
  year,
  age,
  netWithdrawal,
  shortfall,
  endingBalance: 1_000,
});

const set = (selectedType: string | null) =>
  ({
    id: 1,
    selectedType,
    createdAt: '2026-10-05T00:00:00.000Z',
    result: {
      ruleVersion: 'KR-2026.10',
      startYm: '2026-11',
      endYm: '2028-06',
      scenarios: [
        { type: 'A', title: '시나리오 A', yearly: [row(2026, 58, 999)] },
        {
          type: 'D',
          title: '시나리오 D',
          yearly: [row(2026, 58, 2_000_000), row(2027, 59, 24_000_000, 1_200_000), row(2028, 60, 6_000_000)],
        },
      ],
    },
  }) as unknown as ScenarioSet;

describe('monthsInYear', () => {
  it('시작·종료 연도는 포함된 개월만 센다', () => {
    expect(monthsInYear(2026, '2026-11', '2028-06')).toBe(2);
    expect(monthsInYear(2027, '2026-11', '2028-06')).toBe(12);
    expect(monthsInYear(2028, '2026-11', '2028-06')).toBe(6);
    expect(monthsInYear(2029, '2026-11', '2028-06')).toBe(0);
  });
});

describe('buildScenarioOverlay', () => {
  it('선택한 시나리오가 없으면 null', () => {
    expect(buildScenarioOverlay(null)).toBeNull();
    expect(buildScenarioOverlay(set(null))).toBeNull();
  });

  it('선택한 시나리오의 서버 연간값을 나이별 월 평균으로 바꾼다', () => {
    const overlay = buildScenarioOverlay(set('D'));
    expect(overlay?.title).toBe('시나리오 D');
    expect(overlay?.byAge.get(58)?.monthlyNet).toBe(1_000_000);
    expect(overlay?.byAge.get(59)).toEqual({ monthlyNet: 2_000_000, monthlyShortfall: 100_000, endingBalance: 1_000 });
    expect(overlay?.byAge.get(60)?.monthlyNet).toBe(1_000_000);
  });
});
