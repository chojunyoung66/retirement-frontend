# retirement-frontend

은퇴 후 재무 흐름을 시뮬레이션하고 노후 계획을 수립할 수 있는 React 기반 프론트엔드 애플리케이션입니다. 단계별 진단을 통해 국민연금·퇴직연금·개인연금 수입과 생활비·의료비 지출을 분석하고, 20년 장기 현금 흐름을 시각화합니다.

- **배포 서버:** https://retirement-frontend-cjy.vercel.app

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | React 19 + TypeScript 5.8 |
| Build | Vite |
| Routing | React Router 7 |
| State | Redux Toolkit 2 |
| HTTP | Axios |
| Validation | Zod |
| Mock API | MSW (Mock Service Worker) |
| Testing | Vitest |

## 프로젝트 구조

```
src/
├── api/              # Axios API 호출 (auth, portfolio, retirement-goal, simulation)
├── components/       # 공통 UI 컴포넌트 (Button, Input, Toast, ProtectedRoute 등)
├── domain/           # 도메인 모델 및 타입 정의
├── hooks/            # 커스텀 훅 (useDiagnosis, useRetirementGoal 등)
├── screens/          # 페이지 컴포넌트
├── server/           # MSW 목 서버 (개발용)
├── service/          # 비즈니스 로직 (은퇴 계산 서비스)
├── store/            # Redux 슬라이스 (auth, toast)
├── utils/            # 유틸리티 (숫자 포맷 등)
├── App.tsx           # 루트 레이아웃 (헤더·푸터)
├── router.tsx        # 라우트 설정
└── main.tsx          # 앱 진입점
```

## 화면 구성

### 공개 화면
| 경로 | 화면 |
|------|------|
| `/` | 웰컴 (서비스 소개) |
| `/diagnosis` | 진단 유형 선택 |
| `/profile` | 사용자 프로필 입력 |
| `/cashflow` | 현금 흐름 입력 |
| `/scenario` | 시나리오 설정 |
| `/medical` | 의료비 입력 |
| `/signin` | 로그인 |
| `/signup` | 회원가입 |

### 보호 화면 (로그인 필요)
| 경로 | 화면 |
|------|------|
| `/result` | 진단 결과 및 20년 현금 흐름 요약 |
| `/summary` | 최종 요약 |
| `/cashflow-plan` | 20년 현금 흐름 설계 |
| `/portfolio` | 연금 포트폴리오 관리 |
| `/simulation/dashboard` | 시뮬레이션 대시보드 |
| `/simulation/health-insurance` | 건강보험료 시뮬레이션 |
| `/simulation/national-pension` | 국민연금 시뮬레이션 |
| `/simulation/isa` | ISA 시뮬레이션 |
| `/simulation/irp` | IRP 시뮬레이션 |
| `/simulation/severance-pay` | 퇴직금 시뮬레이션 |
| `/simulation/unemployment-benefit` | 실업급여 시뮬레이션 |

## 시작하기

### 환경 변수

`.env` 파일을 생성하고 백엔드 API 주소를 설정합니다.

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 (MSW 목 API 포함)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

### 스크립트

```bash
npm run dev        # Vite 개발 서버
npm run build      # TypeScript 컴파일 + Vite 빌드
npm run preview    # 프로덕션 빌드 미리보기
npm run lint       # ESLint 검사
npm run lint:fix   # ESLint 자동 수정
npm run test       # Vitest 단위 테스트
npm run test:ui    # Vitest UI 대시보드
```

## 주요 기능

- **단계별 은퇴 진단**: 가구 유형·출생연도·소득 현황부터 연금·생활비·의료비까지 순서대로 입력
- **20년 현금 흐름 시뮬레이션**: 물가 상승률·연금 인상률·실업급여 가정을 조정하며 60~79세 재정 흐름 확인
- **시뮬레이션 모듈**: 국민연금, 건강보험, 퇴직금, 실업급여, ISA, IRP 개별 계산
- **연금 포트폴리오 관리**: 국민연금·퇴직연금·개인연금 포트폴리오 CRUD
- **개선 시뮬레이션**: 20년 적자·흑자 분석 결과 기반 맞춤 개선안 제시
- **MSW 목 서버**: 백엔드 없이 개발 가능한 목 API 내장

## 아키텍처

```
화면(Screen) → 훅(Hook) / 서비스(Service) → API / Redux Store
```

- 진단 상태는 `useDiagnosis` 훅의 `useReducer`로 관리 (인메모리)
- 인증 토큰은 Redux 인메모리 상태로만 유지 (localStorage 미사용)
- 보호 라우트는 `ProtectedRoute` 컴포넌트로 일괄 처리
- 라우트 이동 시 자동 스크롤 상단 이동 (`App.tsx`)
