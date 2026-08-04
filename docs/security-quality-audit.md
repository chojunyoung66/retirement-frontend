# 최종 서비스 품질 · 보안 안정성 검토

> 갱신: 2026-08-04 · 대상: `retirement-frontend` + `retirement-backend`  
> 원본 보드: Cursor Canvas `prod-security-quality-audit`  
> 용도: 다음 미션(고도화) 착수 시 Open / Deferred 우선순위 참고

## 1. 한눈에

| 구분 | 건수 | 요약 |
|------|------|------|
| Fixed | 13 | Critical IDOR·CORS·redirect·세션·쿠키·탈퇴 UX·가입 열거 등 반영 |
| Open | 1 | CSP `style-src 'unsafe-inline'` |
| Deferred | 2 | JWT 서버 폐기(denylist), 비밀번호 복잡도 |

**결론:** 라이브 경로(`index` → `bootstrap`) 기준 Critical는 해소. 다음 미션은 Open 1건과 Deferred 중 제품 합의가 된 항목부터.

## 2. 추적 표

| Status | Severity | Area | Finding | Ref | Note |
|--------|----------|------|---------|-----|------|
| Fixed | Critical | BE · IDOR | 포트폴리오 소유권 검사 | BE #19 | get/update/delete + userId |
| Fixed | High | BE · IDOR | 시뮬레이션 PATCH 소유권 | BE #19 | SIMULATION_FORBIDDEN |
| Fixed | High | BE · CORS | FRONTEND_ORIGIN fail-closed | BE #19 | production 미설정 시 기동 실패 |
| Fixed | High | FE · Redirect | returnTo open redirect | FE #30 | 상대 경로만 허용 |
| Fixed | High | BE · Legacy | 레거시 app/server 열린 CORS | BE #22 | 기동 거부 |
| Fixed | High | BE/FE · Auth | 가입 이메일 열거 완화 | BE · FE | `REGISTRATION_UNAVAILABLE` 단일 응답·해시 타이밍 · Google 연동 게이트 유지 |
| Fixed | Medium | FE · Session | logout / 401 시 sessionStorage 정리 | FE #30 · #34 | clearClientRetirementSession |
| Fixed | Medium | FE · Auth | checkAuth 네트워크 vs 401 | FE #31 | error + 재시도 UI |
| Fixed | Medium | BE/FE · Password | password max 72 | BE #20 · FE #31 | 복잡도 규칙은 Deferred |
| Fixed | Medium | BE · Bearer | production 쿠키 전용 | BE #20 | Bearer 무시 |
| Fixed | Medium | FE · API | getMe Zod + 탈퇴 재인증 401 오인 | FE #33 · #34 · BE #21 | INVALID_CREDENTIALS 유지 |
| Fixed | Medium | BE · Limits | /health rate limit · json 64kb · diagnosis Zod | BE #22 | enum/상한/연도 관계 |
| Deferred | Medium | BE · Session | JWT 서버 폐기(denylist) 없음 | auth.middleware | idle 30분 / absolute 12시간으로 완화 |
| Deferred | Medium | BE · Password | 복잡도(문자 종류) 미적용 | auth.schemas | 제품 정책 합의 후 |
| Fixed | Low | FE · Headers | Vercel CSP/XFO/nosniff | FE #31 | style unsafe-inline은 Open |
| Open | Low | FE · CSP | style-src 'unsafe-inline' | vercel.json | 해시/논스로 강화 가능 |

## 3. 관련 품질 수정 (보드 외, 같은 기간)

다음도 고도화 시 회귀 주의.

| 이슈 | 조치 | Ref |
|------|------|-----|
| Google 연동 후 비밀번호 패널 미표시 | 로그인 아래 패널 복구, 지속 토스트 의존 제거 | FE #29 |
| 진단 저장 시 「진단 결과가 없어요」 | 진단 요약 sessionStorage 초안 복원 | FE #32 |
| 탈퇴 틀린 비밀번호 → 로그인 튕김 | 재인증 실패 400 + INVALID_CREDENTIALS 시 세션 유지 | BE #21 · FE #33 |

## 4. 머지 이력 (보안 라운드)

| 저장소 | PR | 내용 |
|--------|-----|------|
| BE | #19 | IDOR + CORS fail-closed |
| BE | #20 | production 쿠키 전용, password max 72 |
| BE | #21 | 탈퇴/프로필 재인증 실패 400 |
| BE | #22 | 레거시 CORS 차단, health/json, diagnosis Zod |
| FE | #29 | Google link 비밀번호 패널 |
| FE | #30 | returnTo 검증, logout 시 session clear |
| FE | #31 | checkAuth 복원력, password max, Vercel 헤더 |
| FE | #32 | 진단 draft persist |
| FE | #33 | 탈퇴 INVALID_CREDENTIALS 시 로그아웃 방지 |
| FE | #34 | 401 시 draft clear, getMe Zod |
| FE | #35 | Render cold-start Google 로그인 UX |

## 5. 다음 미션 후보 (권장 순서)

1. **CSP style 강화 (Open · Low)**  
   - 위치: `retirement-frontend` `vercel.json`  
   - 방향: `'unsafe-inline'` 제거 또는 nonce/hash. Google GSI·인라인 스타일 회귀 테스트 필수

2. **비밀번호 복잡도 (Deferred · Medium)**  
   - 제품 정책(문자 종류·금지 패턴) 확정 후 FE/BE Zod 동시 반영

3. **JWT denylist (Deferred · Medium)**  
   - 로그아웃·탈퇴 즉시 무효화. Redis 등 저장소·TTL·쿠키 슬라이딩과 설계 필요  
   - 현재 완화: HttpOnly 쿠키, idle 30분, absolute 12시간

## 6. 이미 견고한 기반 (재오픈 금지)

- HttpOnly JWT 쿠키 (`Path=/api`, SameSite=Lax, Secure in production)
- 유휴 30분 슬라이딩 + 절대 12시간
- helmet + auth/API rate limit + trust proxy
- Google ID 토큰 audience 검증, 연동 시 비밀번호 재인증
- 가입 실패 시 `REGISTRATION_UNAVAILABLE` 단일 응답 (방식·존재 비공개). `ACCOUNT_LINK_REQUIRED`는 Google 증명 후 게이트로 유지
- 계정 삭제 트랜잭션 + Cascade purge
- 진단 `/me` 스코프, 포트폴리오·시뮬레이션 소유권
- Prisma only, Zod write 경로, 프로덕션 CORS 잠금
- FE: withCredentials, 토큰 localStorage 미사용

## 7. 검증 체크리스트 (고도화 후)

- [ ] Google 로그인 + CSP 위반 Console 없음 (배포 URL)
- [ ] 게스트 진단 → 로그인 → 결과 저장 → `/summary`
- [ ] 탈퇴 틀린 비밀번호 → 화면 유지 + 「비밀번호가 올바르지 않아요」
- [ ] 타 사용자 portfolio/simulation id → 403
- [ ] `FRONTEND_ORIGIN` 미설정 production 기동 실패
- [ ] `/signin?returnTo=//evil.com` → `/result`로 폴백
- [ ] 이미 가입된 이메일로 signup → `REGISTRATION_UNAVAILABLE` (Google-only와 동일 코드·카피)
