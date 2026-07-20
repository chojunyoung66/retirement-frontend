import { describe, it, expect } from 'vitest';
import { resolveSession, isOwner } from './auth-utils';
import type { Session, Portfolio } from './database';

const sessions: Session[] = [
  { token: 'token-user1', userId: 1, email: 'user1@test.com' },
  { token: 'token-user2', userId: 2, email: 'user2@test.com' },
];

describe('resolveSession', () => {
  it('Authorization 헤더가 없으면 null을 반환한다', () => {
    expect(resolveSession(null, sessions)).toBeNull();
  });

  it('유효하지 않은 토큰이면 null을 반환한다', () => {
    expect(resolveSession('Bearer invalid-token', sessions)).toBeNull();
  });

  it('Bearer 접두사를 제거하고 올바른 세션을 반환한다', () => {
    const session = resolveSession('Bearer token-user1', sessions);
    expect(session?.userId).toBe(1);
    expect(session?.email).toBe('user1@test.com');
  });

  it('user2 토큰으로 user2 세션을 반환한다', () => {
    const session = resolveSession('Bearer token-user2', sessions);
    expect(session?.userId).toBe(2);
  });

  it('세션 목록이 비어 있으면 null을 반환한다', () => {
    expect(resolveSession('Bearer token-user1', [])).toBeNull();
  });
});

describe('isOwner — 사용자 간 포트폴리오 접근 차단', () => {
  const portfolio: Portfolio = {
    id: 10,
    userId: 1,
    accountType: 'IRP',
    name: '사용자1의 포트폴리오',
    items: [{ symbol: 'BOND', name: '채권 ETF', allocation: 100 }],
  };

  it('소유자(userId=1)는 자신의 포트폴리오에 접근할 수 있다', () => {
    expect(isOwner(portfolio, 1)).toBe(true);
  });

  it('다른 사용자(userId=2)는 포트폴리오에 접근할 수 없다', () => {
    expect(isOwner(portfolio, 2)).toBe(false);
  });

  it('userId=0은 포트폴리오에 접근할 수 없다', () => {
    expect(isOwner(portfolio, 0)).toBe(false);
  });

  it('userId가 일치하지 않으면 어떤 값이든 false를 반환한다', () => {
    expect(isOwner(portfolio, 999)).toBe(false);
  });
});
