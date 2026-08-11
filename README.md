# retirement-frontend

은퇴 후 재무 흐름을 시뮬레이션하고 노후 계획을 수립하는 React 앱입니다.
단계별 진단으로 국민연금·퇴직연금·개인연금 수입과 생활비·의료비를 분석하고, 20년 현금 흐름을 시각화합니다.

- **배포:** https://retirement-frontend-y2dn.vercel.app
- **백엔드:** https://retirement-backend-ph7y.onrender.com
- **흐름 정의서:** [`docs/feature-design-flow.md`](docs/feature-design-flow.md)
- **미션 9-1 (지표·Tracking·증빙):** [`docs/mission9-1/README.md`](docs/mission9-1/README.md)

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | React 19 + TypeScript 5.8 |
| Build | Vite 6 |
| Routing | React Router 7 |
| State | Redux Toolkit 2 (`auth`, `toast`) + Diagnosis Context |
| HTTP | Axios (`withCredentials`) |
| Validation | Zod |
| Auth | Google Identity Services + HttpOnly 쿠키 세션 |
| Analytics | Amplitude Browser SDK + GA4 gtag 미러 |
| Mock API | MSW (기본 비활성 · `main.tsx`에서 켜기) |
| Testing | Vitest |
| Deploy | Vercel (`/api`·`/health` → Render rewrite) |

## 프로젝트 구조

```
src/
├── analytics/     # Amplitude·GA4·UTM·P0 trackers
├── api/           # Axios 클라이언트 (auth, diagnosis, simulation, portfolio, user)
├── components/    # 공통 UI (Button, Input, Toast, ProtectedRoute, ErrorBoundary)
├── domain/        # 도메인 타입
├── hooks/         # useAuth, useDiagnosis, useSimulation, usePortfolio
├── screens/       # 페이지 컴포넌트
├── server/        # MSW 목 서버
├── service/       # 클라이언트 은퇴·주택연금 계산
├── store/         # Redux (auth, toast)
├── utils/         # draft·세션 정리·safe returnTo·warmBackend
├── App.tsx
├── router.tsx
└── main.tsx
```

## 화면 구성

### 공개
| 경로 | 화면 |
|------|------|
| `/` | 웰컴 |
| `/diagnosis` → `/profile` → `/cashflow` → `/scenario` → `/medical` | 단계별 진단 |
| `/result` | 진단 결과 (게스트 열람 가능 · 저장만 로그인) |
| `/simulation/housing-pension` | 주택연금 (게스트 로컬 계산 · 저장은 로그인) |
| `/signin` · `/signup` | 이메일/Google 로그인·가입 |
| `/privacy` · `/terms` | 개인정보·이용약관 |

### 보호 (로그인 필요)
| 경로 | 화면 |
|------|------|
| `/summary` | 최종 요약 |
| `/account` | 계정·탈퇴 |
| `/cashflow-plan` | 20년 현금 흐름 설계 |
| `/portfolio` | 연금 포트폴리오 |
| `/simulation` | 시뮬레이션 메뉴 |
| `/simulation/dashboard` | 대시보드 |
| `/simulation/{health-insurance,national-pension,isa,irp,severance-pay,unemployment-benefit}` | 개별 시뮬 |

## 시작하기

### 환경 변수

`.env.example`을 참고해 `.env` / `.env.local`을 만듭니다.

```env
# 로컬에서 BE 직접 호출 (BE FRONTEND_ORIGIN=http://localhost:5173)
VITE_API_BASE_URL=http://localhost:3000/api

# 배포와 동일하게 동일 출처 프록시 사용 시
# VITE_API_BASE_URL=/api

# Google OAuth Client ID (BE GOOGLE_CLIENT_ID와 동일 · 없으면 Google 버튼 숨김)
VITE_GOOGLE_CLIENT_ID=

# Amplitude (미설정 시 DEV 콘솔 debug만)
VITE_AMPLITUDE_API_KEY=

# GA4 Measurement ID
VITE_GA4_MEASUREMENT_ID=
```

Vercel 프로젝트 `retirement-frontend-y2dn` Production/Preview에 Amplitude·GA4·Google Client ID가 등록되어 있다.

### 설치 및 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

### 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | TypeScript + Vite 빌드 |
| `npm run preview` | 빌드 미리보기 |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run test` / `test:ui` | Vitest |

## 주요 기능

- **단계별 은퇴 진단** — 가구·소득·연금·생활비·의료비 입력 후 20년 전망
- **게스트 → 저장 게이트** — 결과 열람은 비로그인, 영속 저장 시 로그인 유도
- **HttpOnly 쿠키 세션** — JWT body/localStorage 미사용 · `credentials` 포함 요청
- **Google 로그인·계정 연동** — ID 토큰 검증 · 기존 이메일 계정은 비밀번호 재인증 후 link
- **분석 (미션 9-1)** — Amplitude P0 퍼널 + GA4 유입·이벤트 미러 + UTM 세션 보존
- **시뮬레이션 7종** — 국민연금·건강보험·퇴직금·실업급여·ISA·IRP·주택연금
- **진단 draft** — `sessionStorage`로 리로드·로그인 복귀 복구
- **계정 탈퇴** — 재인증 후 hard delete · 클라이언트 세션/draft 정리

## 아키텍처

```
Screen → Hook / Service → API (Axios) · Redux · sessionStorage
         ↑                    ↘ analytics (Amplitude + GA4)
   Vercel rewrite /api → Render BE (프로덕션)
```

- 진단 런타임: `useDiagnosis` Context · draft는 sessionStorage
- 인증 상태: `GET /api/auth/me` + HttpOnly `retirement_token` 쿠키
- 보호 라우트: `ProtectedRoute` · `/result`·주택연금은 공개 예외
- 콜드스타트 완화: `warmBackend`로 `/health` 워밍
- GA4 DebugView(운영): `/?debug_mode=1` · 평소는 GA4 실시간 보고서
