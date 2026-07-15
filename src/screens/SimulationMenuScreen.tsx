import { useNavigate } from "react-router-dom";

interface SimulationMenuItem {
  key: string;
  title: string;
  description: string;
  path: string;
  badge?: string;
}

const items: SimulationMenuItem[] = [
  {
    key: "health-insurance",
    title: "건강보험",
    description: "은퇴 후 예상 건강보험료를 계산합니다.",
    path: "/simulation/health-insurance",
    badge: "기존",
  },
  {
    key: "isa",
    title: "ISA",
    description: "ISA 계좌의 예상 수익과 절세액을 확인합니다.",
    path: "/simulation/isa",
    badge: "기존",
  },
  {
    key: "national-pension",
    title: "국민연금",
    description: "가입기간과 소득 기준 예상 월 수령액을 계산합니다.",
    path: "/simulation/national-pension",
    badge: "신규",
  },
  {
    key: "irp",
    title: "IRP",
    description: "개인형 퇴직연금의 적립금과 세액공제를 시뮬레이션합니다.",
    path: "/simulation/irp",
    badge: "신규",
  },
  {
    key: "severance-pay",
    title: "퇴직금",
    description: "법정 퇴직금과 예상 세금을 계산합니다.",
    path: "/simulation/severance-pay",
    badge: "신규",
  },
  {
    key: "unemployment-benefit",
    title: "실업급여",
    description: "정년퇴직 후 수령 가능한 구직급여를 계산합니다.",
    path: "/simulation/unemployment-benefit",
    badge: "신규",
  },
];

export default function SimulationMenuScreen() {
  const navigate = useNavigate();

  return (
    <div className="screen-content">
      <section className="hero">
        <h1 className="hero-title">시뮬레이션</h1>
        <p className="hero-subtitle">
          은퇴 준비를 위한 5가지 시뮬레이션을 제공합니다.
          <br />
          원하는 항목을 선택하세요.
        </p>
      </section>

      {items.map((item) => (
        <div key={item.key} className="card">
          <div className="card-title">
            {item.title}
            {item.badge && (
              <span
                className="badge badge-success"
                style={{ marginLeft: 8, verticalAlign: "middle" }}
              >
                {item.badge}
              </span>
            )}
          </div>
          <div className="card-subtitle">{item.description}</div>
          <button className="btn-cta" onClick={() => navigate(item.path)}>
            시작하기
          </button>
        </div>
      ))}

      <div className="mt-16" style={{ display: "flex", gap: 8 }}>
        <button className="btn-back" style={{ flex: 1 }} onClick={() => navigate("/simulation/dashboard")}>
          전체 결과 보기
        </button>
        <button className="btn-back" style={{ flex: 1 }} onClick={() => navigate("/")}>
          홈으로
        </button>
      </div>
    </div>
  );
}
