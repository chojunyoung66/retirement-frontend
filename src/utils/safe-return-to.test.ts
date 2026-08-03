import { describe, expect, it } from "vitest";
import { resolveSafeReturnTo } from "./safe-return-to";

describe("resolveSafeReturnTo", () => {
  it("상대 경로는 그대로 반환한다", () => {
    expect(resolveSafeReturnTo("/result")).toBe("/result");
    expect(resolveSafeReturnTo("/account")).toBe("/account");
  });

  it("프로토콜 상대 URL은 fallback으로 대체한다", () => {
    expect(resolveSafeReturnTo("//evil.com")).toBe("/result");
    expect(resolveSafeReturnTo("//evil.com/phish")).toBe("/result");
  });

  it("절대 URL은 fallback으로 대체한다", () => {
    expect(resolveSafeReturnTo("https://evil.com")).toBe("/result");
    expect(resolveSafeReturnTo("http://evil.com/x")).toBe("/result");
  });

  it("빈 값·null은 fallback을 쓴다", () => {
    expect(resolveSafeReturnTo(null)).toBe("/result");
    expect(resolveSafeReturnTo(undefined)).toBe("/result");
    expect(resolveSafeReturnTo("")).toBe("/result");
    expect(resolveSafeReturnTo("   ")).toBe("/result");
  });

  it("커스텀 fallback을 지원한다", () => {
    expect(resolveSafeReturnTo("//x", "/")).toBe("/");
  });
});
