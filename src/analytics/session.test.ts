import { describe, it, expect } from 'vitest';
import { readUtmFromSearch } from './session';

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
