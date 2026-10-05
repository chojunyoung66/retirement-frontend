import { Link } from "react-router-dom";

/** MVP 개인정보처리방침 — 실제 운영 시 사업자와 문안을 확정하세요 */
export default function PrivacyScreen() {
  return (
    <div className="screen-content">
      <h1 className="card-title">개인정보처리방침</h1>
      <p className="form-hint mt-8">시행일: 2026-10-05 · 은퇴현금 설계센터</p>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          1. 수집 항목
        </h2>
        <p className="form-hint mt-4">
          회원가입·로그인 시 이메일, 이름, 비밀번호(해시 저장) 또는 Google 계정
          식별자를 수집합니다. 진단 저장 시 가구 유형, 출생 연도, 은퇴 시점,
          월 생활비·보험료 등 요약 정보를 보관합니다. 예상 은퇴 소득(국민·퇴직·개인·주택연금)
          금액은 서버에 저장하지 않습니다. 로그인 후 시뮬레이션을 실행하면 입력값과
          계산 결과가 서버에 저장될 수 있습니다. 인출 시나리오 기능을 쓰면 계좌 유형,
          별칭·금융사(선택), 잔액과 과세구분 금액, 생성한 시나리오 결과(최근 5건)를
          보관합니다. 실행계획 리포트를 만들면 그 시점의 계산 결과(계좌별 금액 포함)를
          스냅샷으로 최근 10건까지 보관합니다. 계좌번호는 수집하지 않습니다. PDF 파일은
          요청할 때마다 새로 만들며 서버에 파일로 남기지 않습니다.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          2. 이용 목적
        </h2>
        <p className="form-hint mt-4">
          회원 인증, 진단·시뮬레이션 결과 저장·불러오기, 서비스 개선 및 문의 대응에
          사용합니다. 마케팅 목적의 제3자 제공은 하지 않습니다.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          3. 보관·파기
        </h2>
        <p className="form-hint mt-4">
          계정 유지 기간 동안 보관하며, 회원 탈퇴 시 관련 진단·시뮬레이션·계좌 자산·인출
          시나리오·리포트 데이터를 함께 삭제합니다. 계좌 정보는 계좌별 자산 화면의 “계좌 정보 전체
          삭제”로, 리포트는 같은 화면의 “내 리포트”에서 건별로 언제든 지울 수 있습니다. 계좌
          정보를 지워도 이미 만든 리포트는 남습니다. 인증은 HttpOnly 쿠키로 관리되며, 유휴 약 30분·절대 약
          12시간 후 만료됩니다.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          4. 이용자 권리
        </h2>
        <p className="form-hint mt-4">
          계정 화면에서 저장 진단 삭제·회원 탈퇴를 요청할 수 있습니다. 문의는
          서비스 내 안내에 따라 주세요.
        </p>
      </section>

      <p className="form-hint mt-12">
        <Link to="/terms">이용약관</Link> · <Link to="/">홈으로</Link>
      </p>
    </div>
  );
}
