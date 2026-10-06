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
          스냅샷으로 최대 50건까지 보관하고, 직접 붙인 리포트 이름과 처음 내려받은 시각을
          함께 저장합니다. 계좌번호는 수집하지 않습니다. PDF·엑셀 파일은 요청할 때마다 새로
          만들며 서버에 파일로 남기지 않습니다.
        </p>
        <p className="form-hint mt-4">
          유료 리포트를 결제하면 주문번호, 결제 금액, 결제 상태, 결제수단 종류(카드·간편결제),
          결제사 거래 키, 승인·취소 시각과 영수증 주소를 보관합니다. 카드 번호 등 결제수단 정보는
          결제사만 처리하며 서비스는 받지 않습니다. 검토를 요청하면 질문 내용과 리포트 열람 동의
          시각, 운영자 답변을, 100일 실행을 시작하면 체크리스트 항목별 완료 시각을 보관합니다.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          2. 이용 목적
        </h2>
        <p className="form-hint mt-4">
          회원 인증, 진단·시뮬레이션 결과 저장·불러오기, 리포트 결제·환불 처리, 검토 요청
          답변, 서비스 개선 및 문의 대응에 사용합니다. 마케팅 목적의 제3자 제공은 하지
          않습니다.
        </p>
        <p className="form-hint mt-4">
          검토 요청 시 이용자가 동의한 경우에만 운영자가 해당 리포트 스냅샷(만든 시점의 계산
          결과)과 100일 체크리스트 진행 상황을 열람합니다. 운영자는 입력한 원본 계좌 정보와 다른
          리포트를 보지 않으며, 결제 내역 화면에서는 이메일과 결제 정보만 확인합니다.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          3. 처리 위탁
        </h2>
        <p className="form-hint mt-4">
          결제 승인·취소 처리를 토스페이먼츠㈜에 위탁합니다. 결제사에는 주문번호,
          상품명, 결제 금액만 전달하며 이름·이메일은 전달하지 않습니다. 결제사가 결제 과정에서
          직접 받는 정보는 결제사의 개인정보처리방침을 따릅니다.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          4. 보관·파기
        </h2>
        <p className="form-hint mt-4">
          계정 유지 기간 동안 보관하며, 회원 탈퇴 시 관련 진단·시뮬레이션·계좌 자산·인출
          시나리오·리포트·검토 요청·100일 체크리스트 데이터를 함께 삭제합니다. 계좌 정보는 계좌별
          자산 화면의 “계좌 정보 전체 삭제”로, 리포트는 “내 리포트” 화면에서 건별로 언제든 지울 수
          있습니다. 리포트를 지우면 연결된 검토 요청과 체크리스트도 함께 지워집니다. 계좌 정보를
          지워도 이미 만든 리포트는 남습니다. 인증은 HttpOnly 쿠키로 관리되며, 유휴 약 30분·절대 약
          12시간 후 만료됩니다.
        </p>
        <p className="form-hint mt-4">
          결제 기록은 전자상거래법에 따라 결제일로부터 5년간 보관합니다. 회원 탈퇴나 리포트 삭제
          후에도 결제 기록은 계정과의 연결을 끊은 상태로 남고, 보관 기간이 지나면 파기합니다.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="card-title" style={{ fontSize: "1.05rem" }}>
          5. 이용자 권리
        </h2>
        <p className="form-hint mt-4">
          계정 화면에서 저장 진단 삭제·회원 탈퇴를, 리포트 화면에서 검토 요청 취소를 할 수
          있습니다. 문의는
          서비스 내 안내에 따라 주세요.
        </p>
      </section>

      <p className="form-hint mt-12">
        <Link to="/terms">이용약관</Link> · <Link to="/">홈으로</Link>
      </p>
    </div>
  );
}
