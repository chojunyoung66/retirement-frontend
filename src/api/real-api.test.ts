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
  let token = '';

  beforeAll(async () => {
    if (!runE2E) return;
    await api.post('/auth/signup', { email, password, name: 'E2E테스터' });
    const res = await api.post('/auth/signin', { email, password });
    token = res.data.data.token;
  });

  it.skipIf(!runE2E)('signup → signin 플로우가 정상 동작한다', () => {
    expect(token).toBeTruthy();
  });

  it.skipIf(!runE2E)('토큰으로 /users/me를 조회할 수 있다', async () => {
    const res = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(res.data.data.email).toBe(email);
  });

  it.skipIf(!runE2E)('토큰 없이 /users/me 요청 시 401을 반환한다', async () => {
    await expect(api.get('/users/me')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });

  it.skipIf(!runE2E)('건강보험 시뮬레이션 생성 후 latest로 조회된다', async () => {
    const headers = { Authorization: `Bearer ${token}` };
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
