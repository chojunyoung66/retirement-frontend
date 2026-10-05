import { describe, expect, it } from 'vitest';
import type { YearRow } from '../api/withdrawal-scenario-api';
import {
  PC_MIN_WIDTH,
  canShareFile,
  formatReportDate,
  isShareCancel,
  isShareGestureExpired,
  reportPrintTitle,
  resolveReportDeviceMode,
  toCompactYearRows,
} from './report-view';

const pdf = () => new File(['%PDF'], 'retirement-plan-1.pdf', { type: 'application/pdf' });

describe('resolveReportDeviceMode', () => {
  it('정밀 포인터이면서 넓은 화면만 PC로 본다', () => {
    expect(resolveReportDeviceMode({ hoverFine: true, width: PC_MIN_WIDTH })).toBe('pc');
    expect(resolveReportDeviceMode({ hoverFine: true, width: PC_MIN_WIDTH - 1 })).toBe('mobile');
    // 넓은 태블릿(터치)은 모바일 흐름
    expect(resolveReportDeviceMode({ hoverFine: false, width: 1366 })).toBe('mobile');
  });
});

describe('canShareFile', () => {
  it('share·canShare가 모두 있고 파일을 허용할 때만 true', () => {
    const share = async () => undefined;
    expect(canShareFile({ share, canShare: () => true }, pdf())).toBe(true);
    expect(canShareFile({ share, canShare: () => false }, pdf())).toBe(false);
    expect(canShareFile({ share }, pdf())).toBe(false);
    expect(canShareFile({ canShare: () => true }, pdf())).toBe(false);
    expect(canShareFile(undefined, pdf())).toBe(false);
  });

  it('canShare가 예외를 던지면 false', () => {
    const nav = {
      share: async () => undefined,
      canShare: () => {
        throw new TypeError('files unsupported');
      },
    };
    expect(canShareFile(nav, pdf())).toBe(false);
  });
});

describe('toCompactYearRows', () => {
  it('휴대폰 표에 필요한 4열(나이·세후 인출·연말 잔액·피부양자)만 남긴다', () => {
    const row: YearRow = {
      year: 2027,
      age: 59,
      expense: 3000,
      nationalPension: 0,
      unemployment: 0,
      grossWithdrawal: 3200,
      tax: 200,
      netWithdrawal: 3000,
      shortfall: 0,
      endingBalance: 50000,
      financialIncome: 10,
      dependentStatus: 'CAUTION',
    };
    expect(toCompactYearRows([row])).toEqual([
      { year: 2027, age: 59, netWithdrawal: 3000, endingBalance: 50000, dependentStatus: 'CAUTION' },
    ]);
  });
});

describe('reportPrintTitle', () => {
  it('인쇄 파일명이 될 제목에 id만 쓴다', () => {
    expect(reportPrintTitle(5)).toBe('retirement-plan-5');
  });
});

describe('formatReportDate', () => {
  it('기기 시간대 기준 YYYY-MM-DD', () => {
    const local = new Date(2026, 9, 6, 9, 30);
    expect(formatReportDate(local.toISOString())).toBe('2026-10-06');
  });

  it('잘못된 값이면 앞 10자를 그대로 쓴다', () => {
    expect(formatReportDate('not-a-date-value')).toBe('not-a-date');
  });
});

describe('공유 오류 분류', () => {
  it('사용자가 닫은 경우와 제스처 만료를 구분한다', () => {
    const abort = new DOMException('closed', 'AbortError');
    const expired = new DOMException('gesture', 'NotAllowedError');
    expect(isShareCancel(abort)).toBe(true);
    expect(isShareCancel(expired)).toBe(false);
    expect(isShareGestureExpired(expired)).toBe(true);
    expect(isShareGestureExpired(new Error('x'))).toBe(false);
  });
});
