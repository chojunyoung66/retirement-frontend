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
| `/account-assets` | 계좌별 자산 입력 (DC·연금저축·IRP·ISA·주식·현금) |
| `/withdrawal-scenarios` | 4개 인출 시나리오(A~D) 비교·선택 |
| `/withdrawal-plan/:setId/:type` | 선택 시나리오의 계좌별 실행안 |
| `/report/:id` | 실행계획 리포트 (휴대폰: PDF 공유·저장 / PC: 인쇄·PDF 저장) |
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
| `npm run lint` / `lint:fix` | ESLint (typescript-eslint recommended 적용) |
| `npm run test` / `test:ui` | Vitest (`vitest run` 1회 실행 · watch는 `npx vitest`) |

CI(`.github/workflows/ci.yml`)는 `npm ci` → lint → test → build 순서로 실행합니다.

## 주요 기능

- **단계별 은퇴 진단** — 가구·소득·연금·생활비·의료비 입력 후 20년 전망
- **게스트 → 저장 게이트** — 결과 열람은 비로그인, 영속 저장 시 로그인 유도
- **HttpOnly 쿠키 세션** — JWT body/localStorage 미사용 · `credentials` 포함 요청
- **Google 로그인·계정 연동** — ID 토큰 검증 · 기존 이메일 계정은 비밀번호 재인증 후 link
- **분석 (미션 9-1)** — Amplitude P0 퍼널 + GA4 유입·이벤트 미러 + UTM 세션 보존
- **시뮬레이션 7종** — 국민연금·건강보험·퇴직금·실업급여·ISA·IRP·주택연금
- **4개 인출 시나리오** — 진단 결과 화면 CTA 또는 포트폴리오 화면에서 `/account-assets`로 진입해
  계좌를 입력하면 BE가 A~D 시나리오(세후 인출·세금·자산 소진·피부양자 기간)를 계산하고,
  선택한 안의 계좌별 인출 순서·연도별 흐름을 보여줌. 분석 이벤트 `scenario_compare_view`,
  `scenario_selected`, `withdrawal_plan_view`는 금액 대신 `asset_bucket` 구간만 보냄.
  시나리오 계산은 서버에 저장된 진단을 쓰므로 결과 화면 버튼은 현재 진단을 먼저 저장하고 이동하며,
  비로그인이면 "로그인하고 …" 문구로 로그인 후 자동 저장 → `/account-assets`로 이어감
- **로그인 게이트** — 결과 저장·시나리오 비교 버튼이나 보호 화면 직접 접근으로 로그인 화면에 오면
  이유 배너(`src/utils/auth-gate.ts`)를 고정으로 보여주고 Google(신규면 자동 가입) → 이메일 가입 →
  이메일 로그인 순서로 배치. 헤더 "로그인" 등 일반 진입은 기존 화면. 이벤트 `auth_gate_shown`
  (`gate_reason`, `google_available`)
- **실행계획 리포트** — 실행안 화면의 "이 실행안으로 리포트 만들기"로 결과를 스냅샷으로 고정하고
  `/report/:id`로 이동. 생성 직후 "입력한 계좌 금액은 삭제할까요?" 시트를 띄움(리포트는 유지).
  - 휴대폰: "지금 할 일"을 먼저 보여주고 비교·연도별 표는 접어 둠. 연도별 표는 4열 요약 후
    "자세히 보기"로 7열. 하단 고정 바에서 서버 PDF를 받아 저장하거나, 파일 공유를 지원하는 기기에서는
    금융정보 안내 후 Web Share로 공유(공개 링크 없음)
  - PC: `(hover: hover) and (pointer: fine)` + 폭 1024px 이상이면 960px 폭·2열 요약·전체 표로 보여주고
    "인쇄 / PDF로 저장"(`window.print`)을 기본으로, 서버 PDF 받기를 보조로 둠. User-Agent는 보지 않음
  - 인쇄(`@media print`): 머리글·바닥글·버튼을 숨기고 A4·표 머리행 반복. 인쇄 직전 접힌 구역을 모두
    펼치고 문서 제목을 `retirement-plan-<id>`로 바꿨다가 복구
  - 내 리포트 목록(최근 10건)은 `/account-assets` 하단에서 열기·삭제
  - 분석 이벤트 `report_created`(scenario_type), `report_preview_view`(report_type·device_mode),
    `report_downloaded`(report_format·method: share/download/print) — 금액 없음
  - 실제 공유 시트(iOS·Android)와 Safari·Firefox 인쇄 결과는 자동 점검 범위 밖이라 배포 전 기기에서 확인
- **진단 draft** — `sessionStorage`로 리로드·로그인 복귀 복구
- **연금 재입력 안내** — 서버는 연금 금액을 저장하지 않으므로, 저장 진단 복원 시 연금이 비어 있으면
  `needsPensionReinput` 플래그로 결과 대신 "연금 재입력" 카드를 보여주고 `/cashflow`로 안내
- **세션 종료 시 초기화** — 로그아웃·401 만료·탈퇴로 로그인 상태가 끝나면 진단 Context도 `RESET`
- **로그인 후 자동 저장** — 비로그인 저장 시도 플래그(`retirement_pending_result_save`)는 30분 후 만료,
  저장 실패 시 즉시 정리
- **계정 탈퇴** — 재인증 후 hard delete · 클라이언트 세션/draft 정리
- **홈 수치** — 랜딩의 월 금액·추이 차트는 "예시"로 표기된 일러스트 값(실측 통계 아님)

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
- `result_saved`: Amplitude HTTP 전송 성공 시 GA4에만 미러, 실패 시에만 SDK로 재전송(중복 집계 방지)
- `diagnosis_completed`: 홈 "결과 보기" 복원이나 연금 재입력 필요 상태에서는 전송하지 않음
- 제도 상수(IRP 공제율·ISA 한도·실업급여 상한)는 `service/retirement-service.ts`에 모아 두고
  백엔드 `rule-set.ts`와 같은 값으로 유지
