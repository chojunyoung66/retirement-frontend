import type { PortfolioItem } from "./database";

// items가 배열이고 각 항목이 유효한 PortfolioItem 형태인지 확인 (런타임 방어)
export function isPortfolioItemArray(value: unknown): value is PortfolioItem[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as PortfolioItem).symbol === "string" &&
      typeof (item as PortfolioItem).name === "string" &&
      typeof (item as PortfolioItem).allocation === "number"
  );
}

// 포트폴리오 비중 합계가 100%인지 확인 (부동소수점 오차는 0.01까지 허용)
export function isValidAllocationSum(items: PortfolioItem[]): boolean {
  if (items.length === 0) return false;
  const total = items.reduce((sum, item) => sum + item.allocation, 0);
  return Math.abs(total - 100) < 0.01;
}
