/**
 * 실제 API 모드 통합 테스트
 *
 * 실행 조건: VITE_E2E=true 환경변수가 명시적으로 설정된 경우에만 실행됩니다.
 *   VITE_E2E=true npm test -- --run
 *
 * VITE_API_BASE_URL이 설정돼 있어도 VITE_E2E=true 없이는 skip됩니다.
 * CI에서는 이 변수를 설정하지 않으므로 자동으로 skip됩니다.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

type MetaEnv = { VITE_E2E?: string; VITE_API_BASE_URL?: string };
const env = (import.meta as { env: MetaEnv }).env;

const runE2E = env.VITE_E2E === 'true';
// VITE_API_BASE_URL은 '/api'가 이미 포함된 형태(예: https://host/api)이므로 경로에 중복 추가하지 않음
const api = axios.create({ baseURL: env.VITE_API_BASE_URL ?? '/api' });

describe('실제 API 모드 통합 테스트', () => {
  const email = `ci_test_${Date.now()}@example.com`;
  const password = 'Test1234!';
  let sessionCookie = '';

  beforeAll(async () => {
    if (!runE2E) return;
    await api.post('/auth/signup', { email, password, name: 'E2E테스터' });
    const res = await api.post('/auth/signin', { email, password });
    // body에 JWT 없음 — Set-Cookie만 세션
    expect(res.data.data.token).toBeUndefined();
    const setCookie = res.headers['set-cookie'];
    const cookieLine = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    sessionCookie = cookieLine?.split(';')[0] ?? '';
  });

  it.skipIf(!runE2E)('signup → signin 플로우가 정상 동작한다', () => {
    expect(sessionCookie).toMatch(/^retirement_token=/);
  });

  it.skipIf(!runE2E)('쿠키로 /auth/me를 조회할 수 있다', async () => {
    const res = await api.get('/auth/me', {
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(200);
    expect(res.data.data.email).toBe(email);
  });

  it.skipIf(!runE2E)('쿠키 없이 /auth/me 요청 시 401을 반환한다', async () => {
    await expect(api.get('/auth/me')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });

  it.skipIf(!runE2E)('건강보험 시뮬레이션 생성 후 latest로 조회된다', async () => {
    const headers = { Cookie: sessionCookie };
    const input = {
      pensionIncome: 14400000,
      laborIncome: 0,
      businessIncome: 0,
      interestDividendIncome: 0,
      otherIncome: 0,
      propertyValue: 0,
      carValue: 0,
    };
    const created = await api.post('/simulations/health-insurance', input, { headers });
    expect(created.status).toBe(201);

    const latest = await api.get('/simulations/health-insurance/latest', { headers });
    expect(latest.status).toBe(200);
    expect(latest.data.data.id).toBe(created.data.data.id);
  });
});
