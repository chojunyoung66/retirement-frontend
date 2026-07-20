export function formatWan(amount: number): string {
  if (amount === 0) return '0만원';
  const wan = Math.round(amount / 10000);
  return `${wan.toLocaleString()}만원`;
}

// 앱이 "출생연도"만 입력받으므로(생일 월/일 미수집) 정확한 만 나이 계산은 원천적으로 불가능하다.
// currentYear - birthYear는 해당 연도 생일이 지난 뒤의 만 나이와 같으며, 생일 이전이면 실제보다
// 최대 1세 높게 표시될 수 있다. 생일 데이터 없이는 이 이상의 정확도를 낼 수 없어 의도적으로 유지.
// 정확한 만 나이가 필요하면 ProfileScreen에 생일(월/일) 입력을 추가하는 별도 작업이 필요하다.
export function formatAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

export function formatYearsToRetirement(birthYear: number): number {
  const retirementAge = 60;
  const currentAge = formatAge(birthYear);
  return Math.max(0, retirementAge - currentAge);
}
