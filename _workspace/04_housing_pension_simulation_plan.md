# 주택연금 시뮬레이션 계획서

> 기준 문서: `_workspace/03_housing_pension_section.md`  
> 대상 앱: retirement-frontend  
> 작성일: 2026-08-01

---

## 1. 목표

WelcomeScreen이 약속한 “국민·퇴직·개인연금과 주택연금” 중 **미구현인 주택연금**을, 기존 시뮬레이션 6종과 동일한 UX·API 패턴으로 추가한다.  
산출물은 (1) 예상 월지급금·비용 요약, (2) 진단/장기 현금흐름에의 선택적 반영이다.

**비목표(1차):** HF 공식 계리모형 완전 재현, 신탁/저당 전환 UI, 실제 청약·전자약정.

## 2. 사용자 시나리오

1. 시뮬레이션 대시보드에서 **주택연금** 카드 선택  
2. 연소자 연령(또는 출생연도)·주택시세·지급방식·상품유형 입력  
3. 예상 월지급금·초기보증료·연간 수령액·주의문구 확인  
4. (선택) 결과를 진단 상태의 월 수입 항목으로 반영 → Projection/CashFlow에 표시  
5. 로그인 시 최신 결과 저장·불러오기 (`/simulations/housing-pension`)

## 3. 입력·출력 계약

### 3.1 Input (`HousingPensionInput`)

| 필드 | 타입 | 검증 | 비고 |
|------|------|------|------|
| `youngerSpouseAge` | number | 55~90 | 부부 연소자 만 나이 |
| `housePrice` | number | >0, ≤12억(산정한도) | 시세(원). 가입 가능 여부는 공시가 별도 안내 |
| `productType` | enum | GENERAL \| PREFERENTIAL \| LOAN_REPAY | 1차: 일반/우대/상환용 |
| `payoutMode` | enum | LIFETIME \| LIFETIME_MIXED \| FIXED_TERM_MIXED | 1차 기본: LIFETIME |
| `payoutStyle` | enum | FLAT \| FRONT_LOADED \| STEP_UP | 종신만. 기본 FLAT |
| `isBasicPensionRecipient` | boolean | — | 우대형 자격 |
| `isSingleHomeUnder250m` | boolean | — | 우대: 시가 2.5억 미만 1주택 |
| `existingMortgageBalance` | number? | ≥0 | 상환용일 때 |

### 3.2 Output (`HousingPensionOutput`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `monthlyPayout` | number | 예상 월지급금(원) |
| `annualPayout` | number | monthly × 12 |
| `initialGuaranteeFee` | number | housePrice × 1.0%(2026.3.1~) |
| `annualGuaranteeFeeRate` | number | 0.0095 |
| `eligible` | boolean | 연령·가격 한도 통과 여부 |
| `ineligibilityReasons` | string[] | 미충족 사유 |
| `notice` | string | 시세·계리 가정·소급 불가 안내 |
| `tableVersion` | string | 예: `HF-2026-03-01` |

## 4. 산식 전략 (단계)

| Phase | 내용 | 정확도 |
|-------|------|--------|
| **P0 (MVP)** | HF 공개 **종신·정액 월지급금 표**(연령×주택가격) 보간. 우대는 표×우대계수(시가 구간별). 상환용은 인출한도(대출한도 50~90%) 차감 후 잔여로 월액 재산정(근사) | 표 기반 근사 |
| **P1** | 초기증액·정기증가형, 확정기간혼합, 실거주 예외 안내 문구 | 표+규칙 |
| **P2** | 백엔드에 HF 조회/내부 계수 테이블 연동. 프론트는 API만 호출 | 서버 정합 |

**P0 보간 규칙:**  
- 연령·가격 격자에서 선형 보간.  
- housePrice > 12억 → 산정 기준 12억, 가입 가능 여부는 공시가 별도 고지.  
- youngerSpouseAge < 55 → `eligible=false`.

## 5. 앱 반영 범위

### 5.1 신규·변경 파일 (예상)

| 영역 | 파일 |
|------|------|
| API | `simulation-api.ts` — type `HOUSING_PENSION`, create/latest, zod |
| Hook | `useSimulation.ts` — create/fetch |
| Screen | `HousingPensionSimulationScreen.tsx` |
| Dashboard | `SimulationDashboardScreen.tsx` — 카드·요약 |
| Router | 라우트 `/simulation/housing-pension` |
| Domain | `PensionState`에 `housing?: number` 또는 별도 필드 |
| Service | `calculateProjection` / `calculateLongTermProjection`에 월수입 항목 추가(옵트인) |
| MSW | `handlers.ts` + `database.ts` type 확장 |
| Test | 보간·자격·projection 반영 유닛패스 |

### 5.2 현금흐름 연동

- 진단 요약: `incomeItems`에 `{ label: '주택연금', amount }`  
- 장기표: 전 연도(또는 가입 연령 이후) `monthlyPayout` 합산  
- `generateRecommendations`: 주택연금 미반영·갭 클 때 “주택연금 검토” 추천 1건  
- Welcome 카피와의 **기능 정합** 달성

### 5.3 에러·계약

- 에러 envelope: `{ error: { code, message } }`  
- NOT_FOUND: `HOUSING_PENSION_SIMULATION_NOT_FOUND`  
- 요청 전 `safeParse`, MSW도 최소 필드 검증(포트폴리오 패턴)

## 6. 마일스톤

| # | 산출물 | 완료 기준 |
|---|--------|-----------|
| M1 | 표 데이터 모듈 + 단위 테스트 | 공개표 격자점 오차 0, 중간값 보간 스냅샷 |
| M2 | API·화면·대시보드 | 입력→결과→저장/불러오기 E2E(수동) |
| M3 | Projection/CashFlow 옵트인 반영 | 주택연금 ON/OFF 시 gap 변화 테스트 |
| M4 | MSW·문서 | handlers·README·Welcome 문구와 실기능 일치 |

## 7. 리스크·가정

| 리스크 | 대응 |
|--------|------|
| HF 표≠실가입액 | UI에 “예상·참고용, 공사 조회 필수” 고정 고지 |
| 계리 변경(연 단위) | `tableVersion`으로 버전 관리, 표 교체 시 스냅샷 갱신 |
| 공시가 vs 시세 혼동 | 가입 가능=공시가, 월액=시세임을 화면 분리 표시 |
| 정년 연장 미확정 | 가입 연령 시나리오(60/65) 비교 UI만 제공, 법 단정 금지 |

## 8. 수용 기준 (MVP)

1. 55세 미만 입력 시 계산 거부 + 사유 표시  
2. 60세·4억·종신정액 결과가 HF 공개표와 동일(격자점)  
3. 대시보드에 주택연금 카드·최신 결과 표시  
4. (선택 반영 시) 진단 gap에 월지급금이 수입으로 포함  
5. 타입체크·관련 단위 테스트 통과

## 9. 다음 액션

개발자 합의 후 **M1(표 모듈+테스트)** 부터 TDD로 착수.  
우대·상환용 계수와 Projection 옵트인 범위는 M1 착수 전 한 줄 확인.
