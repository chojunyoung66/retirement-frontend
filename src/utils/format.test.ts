import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatWan, formatAge, formatYearsToRetirement } from './format';

describe('format utilities', () => {
  describe('formatWan', () => {
    it('should format 0 as "0만원"', () => {
      expect(formatWan(0)).toBe('0만원');
    });

    it('should format 10000 as "1만원"', () => {
      expect(formatWan(10000)).toBe('1만원');
    });

    it('should format 50000 as "5만원"', () => {
      expect(formatWan(50000)).toBe('5만원');
    });

    it('should format 1000000 as "100만원"', () => {
      expect(formatWan(1000000)).toBe('100만원');
    });

    it('should round 15000 as "2만원"', () => {
      expect(formatWan(15000)).toBe('2만원');
    });

    it('should round 14999 as "1만원"', () => {
      expect(formatWan(14999)).toBe('1만원');
    });

    it('should handle negative numbers', () => {
      expect(formatWan(-10000)).toBe('-1만원');
    });

    it('should format large numbers with comma separator', () => {
      expect(formatWan(100000000)).toBe('10,000만원');
    });
  });

  describe('formatAge', () => {
    let originalGetFullYear: typeof Date.prototype.getFullYear;

    beforeEach(() => {
      originalGetFullYear = Date.prototype.getFullYear;
      Date.prototype.getFullYear = vi.fn(() => 2026);
    });

    afterEach(() => {
      Date.prototype.getFullYear = originalGetFullYear;
    });

    it('should calculate age correctly for 2000 birth year', () => {
      expect(formatAge(2000)).toBe(26);
    });

    it('should calculate age correctly for 1990 birth year', () => {
      expect(formatAge(1990)).toBe(36);
    });

    it('should calculate age correctly for current year birth', () => {
      expect(formatAge(2026)).toBe(0);
    });

    it('should calculate age correctly for 2025 birth year', () => {
      expect(formatAge(2025)).toBe(1);
    });
  });

  describe('formatYearsToRetirement', () => {
    let originalGetFullYear: typeof Date.prototype.getFullYear;

    beforeEach(() => {
      originalGetFullYear = Date.prototype.getFullYear;
      Date.prototype.getFullYear = vi.fn(() => 2026);
    });

    afterEach(() => {
      Date.prototype.getFullYear = originalGetFullYear;
    });

    it('should return 0 for someone already at retirement age (60)', () => {
      expect(formatYearsToRetirement(1966)).toBe(0);
    });

    it('should return 34 for someone born in 2000', () => {
      expect(formatYearsToRetirement(2000)).toBe(34);
    });

    it('should return 24 for someone born in 1990', () => {
      expect(formatYearsToRetirement(1990)).toBe(24);
    });

    it('should return 0 for someone past retirement age', () => {
      expect(formatYearsToRetirement(1950)).toBe(0);
    });

    it('should return 0 for someone exactly at retirement age (60)', () => {
      expect(formatYearsToRetirement(1966)).toBe(0);
    });

    it('should return positive years for younger people', () => {
      const result = formatYearsToRetirement(2010);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(65);
    });
  });
});
