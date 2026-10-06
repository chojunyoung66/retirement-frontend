import { beforeEach, describe, it, expect } from 'vitest';
import { claimScenarioCompareView, readUtmFromSearch } from './session';

describe('claimScenarioCompareView', () => {
  beforeEach(() => sessionStorage.clear());

  it('같은 세트는 처음 한 번만 true — 화면 재진입(재호출)에도 유지', () => {
    expect(claimScenarioCompareView(16)).toBe(true);
    expect(claimScenarioCompareView(16)).toBe(false);
  });

  it('다시 계산해 새 세트가 생기면 다시 true', () => {
    expect(claimScenarioCompareView(16)).toBe(true);
    expect(claimScenarioCompareView(17)).toBe(true);
    expect(claimScenarioCompareView(16)).toBe(false);
  });

  it('최근 20개 세트까지만 보관', () => {
    for (let id = 1; id <= 21; id++) claimScenarioCompareView(id);
    expect(claimScenarioCompareView(1)).toBe(true);
    expect(claimScenarioCompareView(21)).toBe(false);
  });

  it('저장값이 깨져 있으면 새로 시작', () => {
    sessionStorage.setItem('rc_scenario_compare_viewed', '{broken');
    expect(claimScenarioCompareView(5)).toBe(true);
    expect(claimScenarioCompareView(5)).toBe(false);
  });
});

describe('readUtmFromSearch', () => {
  it('URL의 UTM 값을 읽음', () => {
    expect(readUtmFromSearch('?utm_source=naver&utm_medium=cpc&utm_campaign=rqa')).toEqual({
      utm_source: 'naver',
      utm_medium: 'cpc',
      utm_campaign: 'rqa',
      utm_content: null,
    });
  });

  it('UTM이 없으면 null — 세션 보존값으로 대체하지 않음', () => {
    expect(readUtmFromSearch('')).toBeNull();
    expect(readUtmFromSearch('?tab=1')).toBeNull();
  });

  it('utm_content만 있어도 인식', () => {
    expect(readUtmFromSearch('?utm_content=banner')?.utm_content).toBe('banner');
  });
});
