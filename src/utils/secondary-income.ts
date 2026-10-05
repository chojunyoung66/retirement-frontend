import type { SecondaryIncome } from '../service/retirement-service';

export interface SecondaryIncomeInput {
  startAge: string;
  endAge: string;
  monthlyAmount: string; // 만원 단위
}

export interface SecondaryIncomeCheck {
  income: SecondaryIncome | null;
  message: string | null;
}

/**
 * 제2 수입 한 구간을 검증 — 반영 불가 사유를 사용자 문구로 반환
 * minAge·maxAge는 현금흐름 계산 구간(퇴직 나이 ~ 마지막 연도 나이)
 */
export function validateSecondaryIncome(
  input: SecondaryIncomeInput,
  minAge: number,
  maxAge: number,
): SecondaryIncomeCheck {
  const { startAge, endAge, monthlyAmount } = input;
  if (startAge === '' && endAge === '' && monthlyAmount === '') {
    return { income: null, message: null };
  }

  const start = Number(startAge);
  const end = Number(endAge);
  const monthlyWan = Number(monthlyAmount);
  if (!(start > 0) || !(end > 0) || !(monthlyWan > 0)) {
    return { income: null, message: '시작·종료 나이와 월 수입을 모두 입력해 주세요' };
  }
  if (end < start) {
    return { income: null, message: '종료 나이는 시작 나이 이상이어야 해요' };
  }
  if (end < minAge || start > maxAge) {
    return {
      income: null,
      message: `계산 기간(${minAge}~${maxAge}세)과 겹치지 않아 반영되지 않아요`,
    };
  }
  return {
    income: { startAge: start, endAge: end, monthlyAmount: monthlyWan * 10000 },
    message: null,
  };
}
