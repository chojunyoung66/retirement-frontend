import { describe, expect, it } from 'vitest';
import { resolveExpertReviewUrl } from './expert-review';

describe('resolveExpertReviewUrl', () => {
  it('http(s) 주소만 허용한다', () => {
    expect(resolveExpertReviewUrl('https://forms.example.com/review')).toBe('https://forms.example.com/review');
    expect(resolveExpertReviewUrl(' http://example.com ')).toBe('http://example.com/');
  });

  it('비었거나 다른 스킴이면 null', () => {
    expect(resolveExpertReviewUrl(undefined)).toBeNull();
    expect(resolveExpertReviewUrl('')).toBeNull();
    expect(resolveExpertReviewUrl('javascript:alert(1)')).toBeNull();
    expect(resolveExpertReviewUrl('not a url')).toBeNull();
  });
});
