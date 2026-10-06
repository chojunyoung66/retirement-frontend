import { describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    errorCode: string;
    constructor(code: string) {
      super();
      this.errorCode = code;
    }
  },
}));

import {
  errorCodeFromBlobBody,
  parseReport,
  parseReportList,
  reportDisplayTitle,
  reportPdfFileName,
  reportXlsxFileName,
} from './report-api';

const summary = {
  grossWithdrawal: 100,
  totalTax: 10,
  netWithdrawal: 90,
  depletionAge: null,
  shortfallMonths: 0,
  firstShortfallYm: null,
  dependentLikelyYears: 3,
  endingBalance: 50,
};

const content = {
  title: '은퇴현금 실행계획 리포트',
  generatedAt: '2026-10-06T01:00:00.000Z',
  ruleVersion: 'KR-2026.10',
  basisDates: [{ domain: '연금소득세', effectiveDate: '2026-01-01', source: '소득세법' }],
  startYm: '2026-11',
  endYm: '2058-12',
  assumptions: { inflationRate: 0.02, pensionGrowthRate: 0.02, returnRate: 0.02, financialYieldRate: 0.02, endAge: 90 },
  recommendedType: 'D',
  recommendationNote: '국민연금 개시 후 재판정',
  inputSummary: {
    accountsCount: 1,
    totalBalance: 100,
    nationalPensionSource: 'simulation',
    unemploymentSource: 'none',
    yearsOfServiceSource: 'default',
    propertyProvided: false,
  },
  nextActions: [
    { label: '퇴직연금 DC', actionType: 'ANNUITY', startYm: '2032-01', method: '연금수령', monthlyNet: 1 },
  ],
  comparison: ['A', 'B', 'C', 'D'].map((type) => ({ type, title: `시나리오 ${type}`, recommended: type === 'D', summary })),
  scenario: {
    type: 'D',
    title: '시나리오 D',
    goal: '목표',
    recommended: true,
    priorityOrder: ['실업급여'],
    summary,
    planItems: [],
    yearly: [],
    notes: [],
  },
  accountChecks: [],
  disclaimers: ['추정치입니다'],
};

const report = {
  id: 7,
  scenarioSetId: 3,
  scenarioType: 'D',
  ruleVersion: 'KR-2026.10',
  generatedAt: '2026-10-06T01:00:00.000Z',
  content,
};

describe('parseReport', () => {
  it('스냅샷 본문을 파싱한다', () => {
    const parsed = parseReport(report);
    expect(parsed.content.nextActions[0].actionType).toBe('ANNUITY');
    expect(parsed.content.comparison).toHaveLength(4);
  });

  it('원본 세트가 지워져 scenarioSetId가 null이어도 읽는다', () => {
    expect(parseReport({ ...report, scenarioSetId: null }).scenarioSetId).toBeNull();
  });

  it('지금 할 일의 실행 유형이 정의 밖이면 거부한다', () => {
    const broken = structuredClone(report);
    (broken.content.nextActions[0] as { actionType: string }).actionType = 'SELL';
    expect(() => parseReport(broken)).toThrow();
  });
});

describe('parseReportList', () => {
  const summaryRow = {
    id: report.id,
    scenarioSetId: report.scenarioSetId,
    scenarioType: report.scenarioType,
    ruleVersion: report.ruleVersion,
    generatedAt: report.generatedAt,
  };

  it('관리 필드(이름·첫 다운로드·기준 변경)를 읽는다', () => {
    const row = {
      ...summaryRow,
      title: '아내와 상의용',
      firstDownloadedAt: '2026-10-07T01:00:00.000Z',
      updatedAt: '2026-10-07T01:00:00.000Z',
      isOutdated: true,
    };
    expect(parseReportList([row])).toEqual([row]);
  });

  it('관리 필드가 없는 구버전 응답은 기본값으로 채운다', () => {
    expect(parseReportList([summaryRow])).toEqual([
      { ...summaryRow, title: null, firstDownloadedAt: null, isOutdated: false },
    ]);
    expect(() => parseReportList([{ ...summaryRow, scenarioType: 'E' }])).toThrow();
  });
});

describe('parseReport 월별 데이터', () => {
  it('v1.1 이후 리포트는 월별 시계열을 읽고, 이전 리포트는 없어도 된다', () => {
    const monthly = { ym: ['2026-11'], gross: [1], tax: [0], net: [1], shortfall: [0], balance: [9] };
    const withMonthly = structuredClone(report);
    (withMonthly.content.scenario as Record<string, unknown>).monthly = monthly;
    expect(parseReport(withMonthly).content.scenario.monthly?.ym).toEqual(['2026-11']);
    expect(parseReport(report).content.scenario.monthly).toBeUndefined();
  });
});

describe('reportDisplayTitle', () => {
  it('직접 붙인 이름이 있으면 그 이름, 없으면 날짜·시나리오', () => {
    expect(reportDisplayTitle({ title: '상의용', scenarioType: 'D' }, '2026-10-06')).toBe('상의용');
    expect(reportDisplayTitle({ title: null, scenarioType: 'D' }, '2026-10-06')).toBe(
      '2026-10-06 · D안 실행계획',
    );
  });
});

describe('errorCodeFromBlobBody', () => {
  it('blob 오류 본문에서 코드를 꺼낸다', async () => {
    const body = new Blob([JSON.stringify({ error: { code: 'REPORT_NOT_FOUND', message: 'x' } })], {
      type: 'application/json',
    });
    await expect(errorCodeFromBlobBody(body)).resolves.toBe('REPORT_NOT_FOUND');
  });

  it('JSON이 아니거나 blob이 아니면 UNKNOWN_ERROR', async () => {
    await expect(errorCodeFromBlobBody(new Blob(['<html>']))).resolves.toBe('UNKNOWN_ERROR');
    await expect(errorCodeFromBlobBody(undefined)).resolves.toBe('UNKNOWN_ERROR');
  });
});

describe('reportPdfFileName', () => {
  it('파일명에 개인정보 없이 id만 넣는다', () => {
    expect(reportPdfFileName(12)).toBe('retirement-plan-12.pdf');
    expect(reportXlsxFileName(12)).toBe('retirement-plan-12.xlsx');
  });
});
