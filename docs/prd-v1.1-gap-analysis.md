# PRD v1.1 대비 소스 갭 분석

| 항목 | 내용 |
|---|---|
| 기준 문서 | 은퇴현금 설계센터 PRD v1.1 (소스 반영본) |
| 비교 대상 | `retirement-frontend`, `retirement-backend` (2026-10-05 기준) |
| 상태 표기 | 구현 / 부분 / 미구현 / 의도적 차이 / 이번 고도화 반영 |

## 1. 결론

PRD에서 "신규"로 정의한 기능 대부분은 이미 구현돼 있다. 계좌자산 입력, A/B/C/D 월 단위 인출 엔진,
계좌별 실행안, 리포트 스냅샷과 PDF, 리포트 생성 후 원자료 삭제 시트가 동작한다.
남은 갭은 **계산 정합성**(추천·피부양자·ISA·건보료·퇴직월·배우자 연금)과
**운영 보완**(세금·건보 체크 화면, 동의, 이벤트, rate limit)이며, 이번 고도화에서 반영한다.

## 2. 기능 요구사항

| ID | 기능 | 상태 | 비고 |
|---|---|---|---|
| F-01~F-08 | 기존 진단·결과·저장·20년 현금흐름 | 구현 | 퇴직월 입력은 이번 고도화 반영 |
| F-09 | 7개 시뮬레이션 | 구현 | 기준일 표시는 이번 고도화 반영 |
| F-10 | 포트폴리오 | 구현 | 비중 관리 유지, 잔액은 AccountAsset 담당 |
| F-11 | 계좌별 자산 입력 | 구현 | DC·연금저축·IRP·ISA·주식·현금성 |
| F-12 | 계좌별 과세구분 | 구현 | 4버킷 + 미확인 금액 보수 과세 |
| F-13 | 4개 시나리오 비교 | 구현 | 추천은 규칙 기반으로 변경(이번 반영) |
| F-14 | 계좌별 인출 실행안 | 구현 | 운영 메모 표기 보완 |
| F-15 | 세전/세후 분리 | 부분 → 반영 | 연간표 세전 컬럼, 월별 세후 시리즈 추가 |
| F-16 | 건보 추정/확인 분리 | 미구현 → 반영 | 실제 고지 보험료 입력·차이 표시 |
| F-17 | 피부양자 조건 점검 | 부분 → 반영 | 3단계 추정 + 판단 사유, 부부 동반 판정 |
| F-18 | ISA 전략 | 부분 → 반영 | 전환 추가공제 계산값 제공 |
| F-19 | 상세 리포트 생성 | 구현 | PDF(서버 렌더) + 인쇄 |
| F-20 | 계산 기준일 표시 | 부분 → 반영 | 시나리오·리포트 외 시뮬레이션에도 표시 |

## 3. 화면

| 화면 | 경로 | 상태 |
|---|---|---|
| SCR-01~04 | `/`, `/diagnosis`, `/profile`, `/cashflow` | 구현 |
| SCR-05 | `/result` | 구현(4개 시나리오 CTA 존재) |
| SCR-06 | `/cashflow-plan` | 부분 → 반영(선택 시나리오 서버값 오버레이) |
| SCR-07 | `/portfolio` | 의도적 차이(계좌 잔액은 `/account-assets`) |
| SCR-08 | `/simulation/dashboard` | 구현 |
| SCR-09 | `/withdrawal-scenarios` | 구현 |
| SCR-10 | `/withdrawal-plan/:setId/:type` | 구현(경로 파라미터 방식) |
| SCR-11 | `/tax-health-check` | 미구현 → 반영 |
| SCR-12 | `/report/:id` | 구현(경로 파라미터 방식) |

## 4. 데이터 모델

| PRD 모델 | 현재 | 판단 |
|---|---|---|
| AccountAsset | `AccountAsset` | 구현 |
| TaxBucket | `AccountAsset` 컬럼 4종 | 의도적 차이(1:1이라 분리 불필요) |
| WithdrawalScenario | `WithdrawalScenarioSet`(4안 묶음) | 의도적 차이 |
| WithdrawalPlanItem | 세트 `result` JSON | 의도적 차이(스냅샷 불변성 우선) |
| CashflowMonth | 세트 `result.monthly` JSON | 의도적 차이 |
| ReportSnapshot | `ReportSnapshot`(content JSON, 파일 미저장) | 구현, PDF는 요청 시 렌더 |
| RuleVersion | `rule-set.ts` 상수 + `ruleVersion` 컬럼 | 의도적 차이(코드 리뷰로 버전 관리) |
| 동의 기록 | 없음 | 반영: `User.detailDataConsentAt` |
| 퇴직월 | 없음 | 반영: `Diagnosis.retirementMonth` |

## 5. API

| PRD | 현재 | 판단 |
|---|---|---|
| `/api/v1/*` 접두사 | `/api/*` | 의도적 차이(기존 클라이언트 호환) |
| A-01~A-03 계좌자산 | `GET/POST/DELETE /api/account-assets`, `PATCH/DELETE /:id` | 구현 |
| A-04~A-06 시나리오 | `POST /generate`, `GET /latest`, `GET /:id/plans/:type` | 구현 |
| A-07 세금·건보 체크 | 없음 | 반영: `POST /api/tax-health-check` |
| A-08~A-09 리포트 | `POST /api/reports`, `GET /:id/pdf` | 구현 |
| 시나리오 원자료 삭제 | 없음 | 반영: `DELETE /api/withdrawal-scenarios` |

## 6. 계산 엔진

| ID | 상태 | 비고 |
|---|---|---|
| CAL-01 월별 현금흐름 | 구현 | 시작월은 퇴직월 반영(이번) |
| CAL-02 부부 국민연금 | 부분 → 반영 | 배우자 연금 입력·부부 동반 피부양자 판정 |
| CAL-03 실업급여 | 부분 → 반영 | 시작월 입력 |
| CAL-04 DC 수령방식 비교 | 구현 | 이연퇴직소득, 연금수령 70/60/50% |
| CAL-05 연금저축·IRP 버킷 | 구현 | 비공제 원금 우선 인출 |
| CAL-06 ISA | 부분 → 반영 | 전환 추가공제 계산 |
| CAL-07 건강보험 | 부분 → 반영 | 피부양자 불가 연도 지역보험료 금액화 |
| CAL-08 주식계좌 | 구현 | 원금 회수 중심, 금융소득 추정 |
| CAL-09 세전/세후 | 부분 → 반영 | 월별 세후 시리즈 |
| CAL-10 기준일 | 구현 | 시뮬레이션 출력으로 확대(이번) |

## 7. 분석 이벤트

| 이벤트 | 상태 |
|---|---|
| scenario_compare_view, scenario_selected, withdrawal_plan_view | 구현 |
| report_preview_view, report_downloaded | 구현 |
| tax_health_check_run | 반영 |
| expert_review_requested | 반영(외부 폼 링크 방식) |

금액 원문은 이벤트에 보내지 않는다(자산은 구간 버킷만 전송).

## 8. Acceptance Criteria

| AC | 상태 | 근거 |
|---|---|---|
| AC-01, 02 | 구현 | 진단 플로우, 결과 화면 CTA |
| AC-03, 05~09 | 구현 | `engine.test.ts` 태그 테스트 |
| AC-04 | 구현 | 시나리오별 planItems |
| AC-08 | 반영 | 문구 + 전환 계산값 테스트 |
| AC-10 | 구현 | `report-document.test.ts` |
| AC-11 | 구현 | 보호 라우트 + 로그인 게이트 |
| AC-12 | 구현 → 강화 | 계좌 + 시나리오 세트 원자료 함께 삭제 |
| AC-13 | 구현 | `scenario-events.test.ts` |
| AC-14 | 구현 | 국민연금·실업급여·퇴직금 시뮬레이션 재사용 |
| AC-15 | 구현 | 기준 페르소나 회귀값 고정 |

## 9. 의도적 차이 근거

1. **`/api` 유지**: 프론트 `client.ts`와 배포 프록시가 `/api`를 쓰며, 버저닝 필요가 생기면 그때 도입한다.
2. **스냅샷 JSON**: 시나리오 결과는 생성 시점 규칙으로 고정돼야 하고, 개별 행 수정 요구가 없다.
3. **RuleVersion 상수**: 제도 수치 변경은 코드 리뷰·테스트를 거쳐야 하므로 DB 편집보다 안전하다.
4. **PDF 단일 포맷**: PRD MVP 기준(PDF 또는 DOCX 1개)을 충족한다.

## 10. 고도화 로드맵

| 단계 | 범위 | 상태 (2026-10-05) |
|---|---|---|
| 1 | 엔진: 퇴직월, 배우자 국민연금, 실업급여 시작월, 피부양자 사유, 규칙 기반 추천, ISA 전환, 건보료 금액화 | 완료 |
| 2 | 세금·건보 체크 API·화면, 실제 보험료 비교 | 완료 |
| 3 | 상세 저장 동의, 시나리오 원자료 삭제, 기준일 표시 확대 | 완료 |
| 4 | 실행안 월별/세전 표시, 20년 현금흐름에 선택 시나리오 반영 | 완료 |
| 5 | 전문가 검토 요청, 무거운 API rate limit, 문서 갱신 | 완료 (`VITE_EXPERT_REVIEW_URL` 설정 필요) |

배포 전 확인: 마이그레이션 2건(`20261007_add_retirement_month`, `20261008_add_detail_data_consent`)은
`npm start`의 `prisma migrate deploy`로 적용된다. 엔진 변경으로 기존 회귀 정답값(세금·소진 시점)이 바뀌었고
사유는 `engine.test.ts` 주석에 남겼다.

후속(범위 제외): 연금수령한도 강제, 출생월 기반 연령, 포트폴리오-계좌 연동, DOCX/Excel, 100일 프로그램.
