const MAX_ALLOCATION_DECIMALS = 2;

/** 정규화된 소수 문자열을 비중 입력 규칙(소수 둘째 자리·100% 이하)으로 제한 */
export function limitAllocationDraft(draft: string): string {
  const [intPart, decPart] = draft.split('.');
  const limited =
    decPart === undefined ? intPart : `${intPart}.${decPart.slice(0, MAX_ALLOCATION_DECIMALS)}`;
  return limited !== '' && Number(limited) > 100 ? '100' : limited;
}

/** 부동소수 합계(33.3+33.3+33.4 등)를 소수 둘째 자리로 표시 */
export function formatAllocationTotal(total: number): string {
  return String(Math.round(total * 100) / 100);
}
