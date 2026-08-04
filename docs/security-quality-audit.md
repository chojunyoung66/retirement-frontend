# 최종 서비스 품질 · 보안 안정성 검토

> 갱신: 2026-08-04 · **보안 고도화 라운드 종료**  
> 대상: `retirement-frontend` + `retirement-backend`  
> 원본 보드: Cursor Canvas `prod-security-quality-audit`  
> 정본: 이 문서 (BE는 동일 경로에 요약 포인터만 유지)

## 1. 라운드 결론

| 구분 | 건수 | 요약 |
|------|------|------|
| Fixed | 13 | Critical~High·Medium 핵심 이슈 반영·프로덕션 검증 완료 |
| Accepted | 1 | CSP `style-src 'unsafe-inline'` — Low, 비용 대비 실익 작아 이번 라운드 미착수 |
| Deferred | 2 | JWT denylist, 비밀번호 복잡도 — 제품 정책·인프라 합의 후 |

**판정:** 라이브 경로(`index` → `bootstrap`) 기준 Critical/High는 해소. 가입 열거 완화까지 `main` 반영·정상 동작 확인. **본 라운드는 여기서 종료.**

## 2. 추적 표

| Status | Severity | Area | Finding | Ref | Note |
|--------|----------|------|---------|-----|------|
| Fixed | Critical | BE · IDOR | 포트폴리오 소유권 검사 | BE #19 | get/update/delete + userId |
| Fixed | High | BE · IDOR | 시뮬레이션 PATCH 소유권 | BE #19 | SIMULATION_FORBIDDEN |
| Fixed | High | BE · CORS | FRONTEND_ORIGIN fail-closed | BE #19 | production 미설정 시 기동 실패 |
| Fixed | High | FE · Redirect | returnTo open redirect | FE #30 | 상대 경로만 허용 |
| Fixed | High | BE · Legacy | 레거시 app/server 열린 CORS | BE #22 | 기동 거부 |
| Fixed | High | BE/FE · Auth | 가입 이메일 열거 완화 | BE/FE `main` | `REGISTRATION_UNAVAILABLE` · 해시 타이밍 · `ACCOUNT_LINK_REQUIRED` 유지 |
| Fixed | Medium | FE · Session | logout / 401 시 sessionStorage 정리 | FE #30 · #34 | clearClientRetirementSession |
| Fixed | Medium | FE · Auth | checkAuth 네트워크 vs 401 | FE #31 | error + 재시도 UI |
| Fixed | Medium | BE/FE · Password | password max 72 | BE #20 · FE #31 | 복잡도 규칙은 Deferred |
| Fixed | Medium | BE · Bearer | production 쿠키 전용 | BE #20 | Bearer 무시 |
| Fixed | Medium | FE · API | getMe Zod + 탈퇴 재인증 401 오인 | FE #33 · #34 · BE #21 | INVALID_CREDENTIALS 유지 |
| Fixed | Medium | BE · Limits | /health rate limit · json 64kb · diagnosis Zod | BE #22 | enum/상한/연도 관계 |
| Fixed | Low | FE · Headers | Vercel CSP/XFO/nosniff | FE #31 | style-src는 Accepted로 분리 |
| Accepted | Low | FE · CSP | style-src 'unsafe-inline' | vercel.json | XSS 시 인라인 스타일 완화용. GSI 회귀 비용 대비 Low → 미착수 |
| Deferred | Medium | BE · Session | JWT 서버 폐기(denylist) 없음 | auth.middleware | idle 30분 / absolute 12시간으로 완화 |
| Deferred | Medium | BE · Password | 복잡도(문자 종류) 미적용 | auth.schemas | 제품 정책 합의 후 |

## 3. 관련 품질 수정 (보드 외)

| 이슈 | 조치 | Ref |
|------|------|-----|
| Google 연동 후 비밀번호 패널 미표시 | 로그인 아래 패널 복구 | FE #29 |
| 진단 저장 시 「진단 결과가 없어요」 | 진단 요약 sessionStorage 초안 복원 | FE #32 |
| 탈퇴 틀린 비밀번호 → 로그인 튕김 | 재인증 400 + 세션 유지 | BE #21 · FE #33 |
| Render 콜드스타트 Google 로그인 | `/health` warm · 중복 콜백 가드 · 안내 카피 | FE #35 |

## 4. 머지 · 반영 이력

| 저장소 | 식별 | 내용 |
|--------|------|------|
| BE | #19 | IDOR + CORS fail-closed |
| BE | #20 | production 쿠키 전용, password max 72 |
| BE | #21 | 탈퇴/프로필 재인증 실패 400 |
| BE | #22 | 레거시 CORS 차단, health/json, diagnosis Zod |
| BE | `2c7dfcfb` | signup → `REGISTRATION_UNAVAILABLE` |
| FE | #29 | Google link 비밀번호 패널 |
| FE | #30 | returnTo 검증, logout 시 session clear |
| FE | #31 | checkAuth 복원력, password max, Vercel 헤더 |
| FE | #32 | 진단 draft persist |
| FE | #33 | 탈퇴 INVALID_CREDENTIALS 시 로그아웃 방지 |
| FE | #34 | 401 시 draft clear, getMe Zod |
| FE | #35 | Render cold-start Google 로그인 UX |
| FE | `4d4fad7` | 가입 UX를 `REGISTRATION_UNAVAILABLE`에 맞춤 |

## 5. 이후 선택 과제 (라운드 밖)

제품·인프라 합의 후에만 착수. 긴급도 없음.

1. **비밀번호 복잡도 (Deferred · Medium)** — 문자 종류·금지 패턴 확정 후 FE/BE Zod 동시 반영  
2. **JWT denylist (Deferred · Medium)** — 로그아웃·탈퇴 즉시 무효화. Redis 등 저장소·TTL 설계 필요  
3. **CSP style 강화 (Accepted · Low)** — nonce/hash + Google GSI 회귀. 감사·점수 목적일 때만

## 6. 유지 원칙 (재오픈 금지)

- HttpOnly JWT (`Path=/api`, SameSite=Lax, Secure in production)
- 유휴 30분 슬라이딩 + 절대 12시간
- helmet + auth/API rate limit + trust proxy
- Google ID 토큰 audience 검증, 연동 시 비밀번호 재인증
- 가입 실패 `REGISTRATION_UNAVAILABLE` (존재·방식 비공개). 연동은 `ACCOUNT_LINK_REQUIRED`
- 계정 삭제 트랜잭션 + Cascade purge
- 진단 `/me` 스코프, 포트폴리오·시뮬레이션 소유권
- Prisma only, Zod write 경로, 프로덕션 CORS 잠금
- FE: withCredentials, 토큰 localStorage 미사용

## 7. 프로덕션 검증 (라운드 종료 시점)

운영자 확인 기준. 회귀 시 동일 항목으로 재확인.

- [x] Critical/High 수정 후 핵심 플로우 정상 (진단·로그인·저장·연동)
- [x] 가입 열거 완화 배포 후 정상 (`REGISTRATION_UNAVAILABLE` UX 포함)
- [ ] Google 로그인 + CSP Console 위반 없음 — Accepted(미강화) 상태에서는 필수 아님
- [ ] 타 사용자 portfolio/simulation id → 403 (소유권 회귀 시)
- [ ] `FRONTEND_ORIGIN` 미설정 production 기동 실패
- [ ] `/signin?returnTo=//evil.com` → `/result` 폴백
