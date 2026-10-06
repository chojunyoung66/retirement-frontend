import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

/** MVP 이용약관 — 실제 운영 시 사업자와 문안을 확정하세요 */
export default function TermsScreen() {
  const { hash } = useLocation();

  // 결제 시트의 /terms#refund 링크 — 화면을 그린 뒤라야 해당 조항으로 이동할 수 있다
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="screen-content">
      <h1 className="card-title">이용약관</h1>
      <p className="form-hint mt-8">
        시행일: 2026-10-05 · 은퇴현금 설계센터 (유료 리포트·환불·검토 요청 조항 추가)
      </p>

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
          4. 유료 리포트와 결제
        </h2>
        <p className="form-hint mt-4">
          실행계획 리포트는 화면에 표시된 가격으로 건별 구매하는 디지털
          콘텐츠입니다. 결제는 카드·간편결제로만 할 수 있으며 토스페이먼츠가
          처리하고, 서비스는 카드 번호를 저장하지 않습니다. 결제 금액은 서버가
          정한 가격으로만 승인되며, 결제가 승인되면 선택한 실행안으로 리포트가 즉시
          만들어집니다. 한 번의 결제로 리포트 1건을 만들 수 있고, 만든 리포트를
          지워도 같은 결제로 다시 만들 수 없습니다. 무료로 운영하는 기간에는 결제
          없이 리포트를 만들 수 있습니다.
        </p>
      </section>

      <section className="mt-12" id="refund">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          5. 청약철회와 환불
        </h2>
        <ul className="form-hint mt-4" style={{ paddingLeft: 18 }}>
          <li>
            결제 후 7일 이내이고 리포트를 PDF·엑셀로 내려받거나 인쇄하지 않았다면
            전액 환불받을 수 있습니다.
          </li>
          <li>
            리포트를 내려받거나 인쇄하면 디지털 콘텐츠 제공이 시작된 것으로 보아
            단순 변심에 의한 청약철회가 제한됩니다(전자상거래법 제17조 제2항).
          </li>
          <li>
            계산 오류·접속 장애 등 서비스 잘못으로 리포트를 정상적으로 쓸 수 없으면
            기간과 관계없이 전액 환불합니다.
          </li>
          <li>
            환불은 서비스 내 안내된 문의 경로로 요청하며, 원래 결제수단으로 취소
            처리됩니다. 카드사 사정에 따라 취소 반영까지 영업일 기준 며칠이 걸릴 수
            있습니다. 환불해도 이미 만든 리포트는 삭제되지 않습니다.
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          6. 무료 검토 요청
        </h2>
        <p className="form-hint mt-4">
          리포트 화면에서 검토를 요청하면 운영자가 이용자가 동의한 리포트
          스냅샷과 100일 체크리스트 진행 상황을 보고 앱 안에서 답변합니다. 답변은
          리포트 내용에 대한 일반 안내이며 투자 권유, 세무 대리, 법률 자문이
          아닙니다. 진행 중인 요청은 한 번에 3건까지 할 수 있고, 답변 전에는
          언제든 취소할 수 있습니다.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          7. 책임 제한
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
