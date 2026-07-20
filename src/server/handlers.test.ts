import { describe, it, expect } from "vitest";
import { resolveSession, isOwner } from "./auth-utils";
import type { Session, Portfolio } from "./database";

const sessions: Session[] = [
  { token: "token-a", userId: 1, email: "a@test.com" },
  { token: "token-b", userId: 2, email: "b@test.com" },
];

const portfolio: Portfolio = {
  id: 1,
  userId: 1,
  accountType: "IRP",
  name: "사용자 A의 포트폴리오",
  items: [],
};

describe("resolveSession", () => {
  it("Authorization 헤더가 없으면 null 반환", () => {
    expect(resolveSession(null, sessions)).toBeNull();
  });

  it("유효하지 않은 토큰이면 null 반환", () => {
    expect(resolveSession("Bearer invalid-token", sessions)).toBeNull();
  });

  it("유효한 토큰이면 해당 세션 반환", () => {
    expect(resolveSession("Bearer token-a", sessions)).toEqual(sessions[0]);
  });
});

describe("isOwner — 포트폴리오 소유권 검사", () => {
  it("소유자 userId와 일치하면 true", () => {
    expect(isOwner(portfolio, 1)).toBe(true);
  });

  it("다른 사용자 userId이면 false → 403 조건 성립", () => {
    expect(isOwner(portfolio, 2)).toBe(false);
  });

  it("조회: 다른 사용자는 접근 불가", () => {
    const session = resolveSession("Bearer token-b", sessions)!;
    expect(isOwner(portfolio, session.userId)).toBe(false);
  });

  it("수정: 다른 사용자는 변경 불가", () => {
    const session = resolveSession("Bearer token-b", sessions)!;
    expect(isOwner(portfolio, session.userId)).toBe(false);
  });

  it("삭제: 다른 사용자는 삭제 불가", () => {
    const session = resolveSession("Bearer token-b", sessions)!;
    expect(isOwner(portfolio, session.userId)).toBe(false);
  });

  it("소유자는 자신의 포트폴리오에 모든 권한 보유", () => {
    const session = resolveSession("Bearer token-a", sessions)!;
    expect(isOwner(portfolio, session.userId)).toBe(true);
  });
});
