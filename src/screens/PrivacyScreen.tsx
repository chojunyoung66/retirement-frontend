import { Link } from "react-router-dom";

/** MVP 개인정보처리방침 — 실제 운영 시 사업자와 문안을 확정하세요 */
export default function PrivacyScreen() {
  return (
    <div className="screen-content">
      <h1 className="card-title">개인정보처리방침</h1>
      <p className="form-hint mt-8">시행일: 2026-08-03 · 은퇴현금 설계센터</p>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          1. 수집 항목
        </h2>
        <p className="form-hint mt-4">
          회원가입·로그인 시 이메일, 이름, 비밀번호(해시 저장) 또는 Google 계정
          식별자를 수집합니다. 진단 저장 시 가구 유형, 출생 연도, 은퇴 시점,
          월 생활비·보험료 등 요약 정보를 보관합니다. 예상 은퇴 소득(국민·퇴직·개인·주택연금)
          금액은 서버에 저장하지 않습니다. 로그인 후 시뮬레이션을 실행하면 입력값과
          계산 결과가 서버에 저장될 수 있습니다.
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
          계정 유지 기간 동안 보관하며, 회원 탈퇴 시 관련 진단·시뮬레이션 데이터를
          함께 삭제합니다. 인증은 HttpOnly 쿠키로 관리되며, 유휴 약 30분·절대 약
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
