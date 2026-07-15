import {
  useRouteError,
  isRouteErrorResponse,
  useNavigate,
} from "react-router-dom";

export default function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  const is404 = isRouteErrorResponse(error) && error.status === 404;

  const title = is404 ? "페이지를 찾을 수 없습니다" : "오류가 발생했습니다";
  const description = is404
    ? "요청하신 페이지가 존재하지 않습니다."
    : "잠시 후 다시 시도해 주세요.";

  return (
    <div className="screen-content">
      <div className="card" style={{ textAlign: "center", marginTop: 40 }}>
        <div className="card-title">{title}</div>
        <p className="card-subtitle" style={{ marginBottom: 24 }}>
          {description}
        </p>
        <button className="btn-cta" onClick={() => navigate("/")}>
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}
