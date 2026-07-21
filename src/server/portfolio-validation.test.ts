import { describe, it, expect } from "vitest";
import { isPortfolioItemArray, isValidAllocationSum } from "./portfolio-validation";
import type { PortfolioItem } from "./database";

describe("isPortfolioItemArray", () => {
  it("배열이 아니면 false", () => {
    expect(isPortfolioItemArray("not-an-array")).toBe(false);
    expect(isPortfolioItemArray(undefined)).toBe(false);
    expect(isPortfolioItemArray(null)).toBe(false);
  });

  it("빈 배열은 true (형태 자체는 유효)", () => {
    expect(isPortfolioItemArray([])).toBe(true);
  });

  it("필드가 누락되면 false", () => {
    expect(isPortfolioItemArray([{ symbol: "BOND", name: "채권" }])).toBe(false);
  });

  it("타입이 잘못되면 false", () => {
    expect(
      isPortfolioItemArray([{ symbol: "BOND", name: "채권", allocation: "100" }])
    ).toBe(false);
  });

  it("올바른 형태면 true", () => {
    expect(
      isPortfolioItemArray([{ symbol: "BOND", name: "채권", allocation: 100 }])
    ).toBe(true);
  });
});

describe("isValidAllocationSum", () => {
  const item = (allocation: number): PortfolioItem => ({
    symbol: "X",
    name: "테스트",
    allocation,
  });

  it("합계가 정확히 100이면 true", () => {
    expect(isValidAllocationSum([item(60), item(40)])).toBe(true);
  });

  it("합계가 100이 아니면 false", () => {
    expect(isValidAllocationSum([item(60), item(30)])).toBe(false);
    expect(isValidAllocationSum([item(60), item(50)])).toBe(false);
  });

  it("항목이 없으면 false", () => {
    expect(isValidAllocationSum([])).toBe(false);
  });

  it("부동소수점 오차(0.01 이내)는 허용", () => {
    expect(isValidAllocationSum([item(33.34), item(33.33), item(33.33)])).toBe(true);
  });

  it("단일 항목이 100이면 true", () => {
    expect(isValidAllocationSum([item(100)])).toBe(true);
  });
});
