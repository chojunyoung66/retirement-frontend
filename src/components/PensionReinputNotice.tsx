import { useNavigate } from "react-router-dom";
import Button from "./Button";

/** 서버 복원 후 연금 금액이 비어 있을 때 결과 대신 보여주는 안내 */
export default function PensionReinputNotice() {
  const navigate = useNavigate();
  return (
    <div className="screen-content">
      <div className="card">
        <div className="card-title">연금 금액을 다시 입력해 주세요</div>
        <div className="card-subtitle">
          예상 은퇴 소득(국민·퇴직·개인·주택연금) 금액은 개인정보 보호를 위해
          서버에 저장하지 않아요. 이 기기에 남은 입력값이 없어 지금 결과를
          계산하면 부족액이 실제보다 크게 보일 수 있어요.
        </div>
        <div className="mt-16">
          <Button onClick={() => navigate("/cashflow")}>연금 입력하러 가기</Button>
        </div>
      </div>
    </div>
  );
}
