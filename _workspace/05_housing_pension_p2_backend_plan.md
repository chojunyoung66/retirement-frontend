# 주택연금 P2 — 백엔드 연동 계획서 (검토용)

> 기준: P0/P1 프론트 완료 (`housing-pension-service`, `TABLE_VERSION=HF-2026-03-01`)  
> 대상: `retirement-backend` + `retirement-frontend`  
> 작성일: 2026-08-01  
> 상태: **완료** (BE API·마이그레이션 배포, FE는 서버 응답 SoT)

---

## 1. 왜 지금인가

- 프론트는 이미 `POST/GET /simulations/housing-pension`을 호출한다.
- `ENABLE_MSW=false`, `VITE_API_BASE_URL` → Render 실백엔드.
- 백엔드에 `HOUSING_PENSION` 타입·라우트가 **없어** 실환경에서 생성/불러오기가 실패한다.
- P2 목표: **산식의 단일 진실 공급원(SoT)을 서버로 옮기고**, 프론트는 API만 호출한다.

---

## 2. 목표 / 비목표

### 목표
1. 백엔드에 기존 6종과 동일한 `POST …/housing-pension` + `GET …/latest` 추가  
2. 서버에서 P0 표 보간 + P1 지급유형·혼합·상환용 규칙으로 `outputData` 산출·저장  
3. 프론트는 요청·응답 계약만 유지하고, **런타임 산식을 서버 결과에 위임**  
4. `tableVersion`을 서버가 내려주고, 표 갱신 시 서버만 교체

### 비목표 (P2 밖)
- HF 공식 Open API / 실시간 계리엔진 완전 재현  
- 청약·전자약정·신탁/저당 UI  
- Diagnosis DB에 `housingPension` 영속 필드 강제 (로컬 옵트인 유지 가능)  
- Jwt → HttpOnly 쿠키 전환 (별도 보안 트랙)

---

## 3. 현황 요약

| 계층 | 상태 |
|------|------|
| FE 화면·API 클라이언트 | ✅ 완료 |
| FE 산식 (`housing-pension-service`) | ✅ MSW·단위테스트용 유지 (런타임 SoT는 서버) |
| BE `HOUSING_PENSION` + create/latest | ✅ 완료 |
| Prisma migrate / Render 배포 | ✅ 완료 |
| FE 런타임 서버 SoT | ✅ 완료 (로컬 폴백 제거) |
| FE MSW | ✅ 있으나 기본 OFF |
| BE `SimulationType` enum | ❌ 6종만 (주택연금 없음) |
| BE create/latest 라우트 | ❌ 없음 |
| 실배포 API | ❌ 404/실패 예상 |

**백엔드 패턴 (따를 것):** Express + Prisma + Zod, JWT,  
성공 `{ success, data }`, 오류 `{ success: false, error: { code, message } }`.  
기존 시뮬레이션은 **컨트롤러에서 인라인 계산** 후 `simulationService.createX` — P2에서는 Clean Architecture 가이드에 맞춰 **application service로 산식 분리**를 권장(아래 옵션 A).

---

## 4. 핵심 결정 (검토 포인트)

### D1. 산식 이식 방식

| 옵션 | 내용 | 장점 | 단점 |
|------|------|------|------|
| **A. 서버로 로직 이전 (권장)** | FE `housing-pension-service`를 BE `application/services`로 이식 | SoT 단일화, 클라이언트가 표를 들고 다니지 않음 | FE 단위테스트는 “계약 스냅샷”으로 축소 필요 |
| B. 서버는 저장만, 산식은 FE | FE가 계산한 output을 POST body에 실어 저장 | 구현 빠름 | 조작·불일치 가능, P2 목표와 불합치 |
| C. HF 외부 API 프록시 | 공사/제3 조회 API 연동 | 정확도↑ | 공개 API·약관·가용성 불확실, 범위 폭증 |

**권장: A.** P1까지의 표+규칙을 서버 모듈로 옮기고, `notice`에 “근사·공사 조회 필수” 유지.

### D2. 프론트 산식 모듈 처리

| 옵션 | 내용 |
|------|------|
| **A'. 공유 패키지 / 복사 후 FE는 MSW·테스트만 사용** | 런타임 create는 서버 응답만 사용 |
| B'. FE에서 산식 파일 삭제 | MSW도 서버 미기동 시 깨짐 → 로컬 목은 단순 fixture로 |
| C'. FE·BE 이중 유지 | 드리프트 위험 — 비권장 |

**권장: A'.** 단기: 코드를 BE로 복사(동일 테스트 이식). 중기: 모노레포 shared 패키지 검토.

### D3. Prisma 마이그레이션

`SimulationType`에 `HOUSING_PENSION` 추가 → `prisma migrate` 필수.  
기존 6종 row와 동일 테이블(`SimulationResult` JSON input/output) 사용.

---

## 5. API 계약 (변경 최소화)

이미 FE가 기대하는 계약과 동일하게 맞춤.

### `POST /api/simulations/housing-pension`
- Auth: Bearer JWT  
- Body: FE `housingPensionInputSchema`와 동일  
- 201: `{ success: true, data: Simulation }`  
  - `type: "HOUSING_PENSION"`  
  - `outputData`: FE `HousingPensionOutput` 필드 세트  
- 400: `VALIDATION_ERROR` / 자격 실패 시  
  - **권장:** 자격 미충족도 200/201로 `eligible:false`를 저장할지, 400으로 거절할지  
  - **현 FE·MSW:** 계산 결과를 저장하고 `eligible:false`를 UI에 표시 → **서버도 동일(저장+eligible)** 권장

### `GET /api/simulations/housing-pension/latest`
- 404: `{ error: { code: "HOUSING_PENSION_SIMULATION_NOT_FOUND", message } }`  
  (BE는 보통 `success:false`도 포함 — FE는 `error.code`만 읽음)

---

## 6. 백엔드 작업 분해 (TDD)

워크스페이스 규칙: 해피패스 테스트 → 실패 → 구현 → `npm run type` / `npm run test`.

| ID | 작업 | 산출물 |
|----|------|--------|
| B1 | Prisma enum `HOUSING_PENSION` + migrate | `schema.prisma`, migration |
| B2 | Zod request schema (FE와 동기) | `inbound/schemas/…` |
| B3 | `HousingPensionService.calculate` + 단위테스트 (FE 17케이스 이식) | `application/services/housing-pension.service.ts` (+test) |
| B4 | `SimulationService` create/latest 메서드 + NOT_FOUND | service + repo |
| B5 | Controller 라우트 POST/GET + 통합/슈퍼테스트 | `simulation.controller` / router |
| B6 | `bootstrap.ts` DI 조립 | 의존성 주입 |
| B7 | 배포(Render) migrate deploy | 운영 반영 |

**엣지(해피패스 합의 후 최대 2개 제안):**  
(1) 확정기간 75세+ → `eligible:false` 저장  
(2) 상환용 인출 50~90% 클램프

---

## 7. 프론트 작업 분해

| ID | 작업 | 내용 |
|----|------|------|
| F1 | 런타임 산식 제거 | `createHousingPensionSimulation`은 서버 `outputData`만 신뢰 |
| F2 | MSW | 서버와 동일 모듈을 import하거나 fixture; OFF 기본 유지 |
| F3 | 계약 테스트 | 60세·4억 격자점 등은 **서버 통합/E2E** 또는 shared 테스트로 이동 |
| F4 | 에러 UX | 백엔드 미배포 구간 대비 안내(선택) |
| F5 | 문서 | `_workspace/04_…` P2 ✅, README 엔드포인트 |

FE `housing-pension-service.ts`는 **삭제 대신** `src/service`에 두되 create 경로에서 호출하지 않거나, BE로 이관한 뒤 MSW 전용으로 남기는 방안을 D2에서 확정.

---

## 8. 마일스톤·수용 기준

| 단계 | 완료 조건 |
|------|-----------|
| P2-a | BE 단위테스트: 60세·4억 종신정액 = 842,000원, `tableVersion` 일치 |
| P2-b | POST create → DB 저장 → GET latest 왕복 (인증 사용자) |
| P2-c | FE(실 API)에서 계산·불러오기 성공 |
| P2-d | MSW OFF 기준으로 대시보드 주택연금 카드 동작 |
| P2-e | 타입체크·BE/FE 테스트 그린 |

---

## 9. 리스크

| 리스크 | 대응 |
|--------|------|
| FE/BE 산식 드리프트 | 테스트 스위트를 BE로 이전, FE는 호출만 |
| Prisma enum 배포 누락 | migrate deploy를 릴리스 체크리스트에 명시 |
| 표 근사 ≠ 실가입액 | `notice` 유지, UI 고지 유지 |
| 컨트롤러 인라인 관례 vs service 분리 | **service 분리(A)** 로 가이드 준수, 기존 6종은 이번 PR에서 리팩터하지 않음 |
| Render 콜드스타트 | E2E flaky 가능 — 재시도·헬스체크 |

---

## 10. 제안 일정 (상대)

1. 검토 합의: D1=A, D2=A', 자격 미충족=저장+`eligible:false`  
2. BE B1~B3 (½~1일)  
3. BE B4~B6 + 배포 B7 (½일)  
4. FE F1~F5 (½일)  
5. 실 API 스모크

---

## 11. 검토 질문 (결정 필요)

1. **D1** 서버 산식 이전(A)에 동의하는가?  
2. **자격 미충족**을 저장할지(현 FE) / 400으로 거절할지?  
3. FE 산식 파일은 **유지(MSW/테스트)** vs **즉시 삭제**?  
4. Diagnosis API에 `housingPension` 영속을 **이번 P2에 넣을지** (기본: 넣지 않음)?  
5. 작업 순서: **BE 먼저 머지 → FE 정리** vs 모노 PR?

---

## 참고 경로

- FE 산식: `retirement-frontend/src/service/housing-pension-service.ts`  
- FE API: `retirement-frontend/src/api/simulation-api.ts`  
- BE 시뮬 컨트롤러: `retirement-backend/src/inbound/controllers/simulation.controller.ts`  
- BE Prisma: `retirement-backend/prisma/schema.prisma`  
- 기존 계획: `retirement-frontend/_workspace/04_housing_pension_simulation_plan.md`
