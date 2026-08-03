import { Link } from "react-router-dom";

/** MVP 이용약관 — 실제 운영 시 사업자와 문안을 확정하세요 */
export default function TermsScreen() {
  return (
    <div className="screen-content">
      <h1 className="card-title">이용약관</h1>
      <p className="form-hint mt-8">시행일: 2026-08-03 · 은퇴현금 설계센터</p>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          1. 서비스 성격
        </h2>
        <p className="form-hint mt-4">
          본 서비스는 은퇴·현금흐름 설계를 위한 참고용 예측·시뮬레이션을
          제공합니다. 결과는 법적·세무·금융 자문이 아니며, 실제 제도·상품 가입은
          관련 기관·금융회사에서 확인해야 합니다.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          2. 계정
        </h2>
        <p className="form-hint mt-4">
          이메일 또는 Google 계정으로 가입할 수 있습니다. 계정 정보는 안전하게
          관리해 주세요. 탈퇴 시 저장 데이터가 삭제됩니다.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          3. 저장 범위
        </h2>
        <p className="form-hint mt-4">
          로그인 후 진단 요약을 저장할 수 있으며, 예상 은퇴 소득(연금) 실값은
          서버에 저장하지 않습니다. 시뮬레이션 실행 시 입력·결과가 서버에 남을 수
          있습니다. 자세한 내용은{" "}
          <Link to="/privacy">개인정보처리방침</Link>을 참고하세요.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          4. 책임 제한
        </h2>
        <p className="form-hint mt-4">
          서비스는 합리적인 범위에서 제공되나, 예측 오차·제도 변경·이용자 입력
          오류로 인한 손해에 대해 법령이 허용하는 한도에서 책임을 제한합니다.
        </p>
      </section>

      <p className="form-hint mt-12">
        <Link to="/privacy">개인정보처리방침</Link> · <Link to="/">홈으로</Link>
      </p>
    </div>
  );
}
