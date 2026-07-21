const RETIREMENT_GOAL_NUMBER_FIELDS = [
  "birthYear",
  "retirementYear",
  "monthlyLivingExpense",
  "nationalPension",
  "retirementAsset",
] as const;

// 정년 목표 생성/수정 요청 바디의 필드 타입을 런타임에서 검증한다 (프론트 zod 스키마와 동일 기준).
// partial: true면 PATCH처럼 제공된 필드만 검사하고, false면 POST처럼 모든 필드가 존재해야 한다.
export function isValidRetirementGoalInput(
  value: unknown,
  { partial }: { partial: boolean }
): boolean {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;

  return RETIREMENT_GOAL_NUMBER_FIELDS.every((field) => {
    const hasField = field in body;
    if (!hasField) return partial;
    return typeof body[field] === "number";
  });
}
