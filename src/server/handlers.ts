import { http, delay, HttpResponse } from "msw";
import { getLocalStorage, setLocalStorage } from "../utils/local-storage";
import database, { type Database } from "./database";
import { resolveSession, isOwner } from "./auth-utils";
import { isPortfolioItemArray, isValidAllocationSum } from "./portfolio-validation";
import { isValidRetirementGoalInput } from "./retirement-goal-validation";

const loadedDatabase: Database = getLocalStorage<Database>("mockDatabase") ?? database;

const handlers = [
  // 회원가입
  http.post("/api/auth/signup", async ({ request }) => {
    await delay(500);

    const body = (await request.json()) as {
      email: string;
      password: string;
      name: string;
    };
    const { email, password, name } = body;

    // 이미 존재하는 사용자 확인
    if (loadedDatabase.users.some((user) => user.email === email)) {
      return HttpResponse.json(
        { error: { code: "DUPLICATE_EMAIL", message: "이미 존재하는 이메일입니다" } },
        { status: 409 }
      );
    }

    // 새 사용자 생성
    const newUser = {
      id: Math.max(0, ...loadedDatabase.users.map((u) => u.id)) + 1,
      email,
      password,
      name,
    };
    loadedDatabase.users.push(newUser);
    setLocalStorage("mockDatabase", loadedDatabase);

    // 토큰 생성
    const token = crypto.randomUUID();
    loadedDatabase.sessions.push({ token, userId: newUser.id, email });
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json(
      {
        success: true,
        data: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          token,
        },
      },
      { status: 201 }
    );
  }),

  // 로그인
  http.post("/api/auth/signin", async ({ request }) => {
    await delay(500);

    const body = (await request.json()) as { email: string; password: string };
    const { email, password } = body;

    // 사용자 찾기
    const user = loadedDatabase.users.find((u) => u.email === email);
    if (!user || user.password !== password) {
      return HttpResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 올바르지 않습니다" } },
        { status: 401 }
      );
    }

    // 토큰 생성
    const token = crypto.randomUUID();
    loadedDatabase.sessions.push({ token, userId: user.id, email: user.email });
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          token,
        },
      },
      { status: 200 }
    );
  }),

  // 사용자 정보 조회
  http.get("/api/users/me", async ({ request }) => {
    await delay(500);

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return HttpResponse.json(
        { error: { code: "INVALID_TOKEN", message: "토큰이 없습니다" } },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const session = loadedDatabase.sessions.find((s) => s.token === token);
    if (!session) {
      return HttpResponse.json(
        { error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } },
        { status: 401 }
      );
    }

    const user = loadedDatabase.users.find((u) => u.id === session.userId);
    if (!user) {
      return HttpResponse.json(
        { error: { code: "USER_NOT_FOUND", message: "사용자를 찾을 수 없습니다" } },
        { status: 404 }
      );
    }

    return HttpResponse.json(
      { success: true, data: { id: user.id, email: user.email, name: user.name } },
      { status: 200 }
    );
  }),

  // 정년 목표 조회
  http.get("/api/retirement-goals/me", async ({ request }) => {
    await delay(300);

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "토큰이 없습니다" } }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const session = loadedDatabase.sessions.find((s) => s.token === token);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const goal = loadedDatabase.retirementGoals.find((g) => g.userId === session.userId);
    if (!goal) {
      return HttpResponse.json(
        { error: { code: "RETIREMENT_GOAL_NOT_FOUND", message: "정년 목표를 찾을 수 없습니다" } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ success: true, data: goal }, { status: 200 });
  }),

  // 정년 목표 생성
  http.post("/api/retirement-goals", async ({ request }) => {
    await delay(300);

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "토큰이 없습니다" } }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const session = loadedDatabase.sessions.find((s) => s.token === token);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (!isValidRetirementGoalInput(body, { partial: false })) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "필수 항목이 누락되었거나 형식이 올바르지 않습니다" } },
        { status: 400 }
      );
    }

    const newGoal = {
      id: Math.max(0, ...loadedDatabase.retirementGoals.map((g) => g.id)) + 1,
      userId: session.userId,
      ...body,
    } as typeof loadedDatabase.retirementGoals[0];
    loadedDatabase.retirementGoals.push(newGoal);
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json(
      { success: true, data: newGoal },
      { status: 201 }
    );
  }),

  // 정년 목표 삭제
  http.delete("/api/retirement-goals/me", async ({ request }) => {
    await delay(300);

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "토큰이 없습니다" } }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const session = loadedDatabase.sessions.find((s) => s.token === token);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const index = loadedDatabase.retirementGoals.findIndex((g) => g.userId === session.userId);
    if (index === -1) {
      return HttpResponse.json(
        { error: { code: "RETIREMENT_GOAL_NOT_FOUND", message: "정년 목표를 찾을 수 없습니다" } },
        { status: 404 }
      );
    }

    loadedDatabase.retirementGoals.splice(index, 1);
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // 정년 목표 업데이트
  http.patch("/api/retirement-goals/me", async ({ request }) => {
    await delay(300);

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "토큰이 없습니다" } }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const session = loadedDatabase.sessions.find((s) => s.token === token);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const goal = loadedDatabase.retirementGoals.find((g) => g.userId === session.userId);
    if (!goal) {
      return HttpResponse.json(
        { error: { code: "RETIREMENT_GOAL_NOT_FOUND", message: "정년 목표를 찾을 수 없습니다" } },
        { status: 404 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (!isValidRetirementGoalInput(body, { partial: true })) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "필드 형식이 올바르지 않습니다" } },
        { status: 400 }
      );
    }

    Object.assign(goal, body);
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json({ success: true, data: goal }, { status: 200 });
  }),

  // 포트폴리오 목록 조회
  http.get("/api/pension-portfolios", async ({ request }) => {
    await delay(300);

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return HttpResponse.json(
        { error: { code: "INVALID_TOKEN", message: "토큰이 없습니다" } },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const session = loadedDatabase.sessions.find((s) => s.token === token);
    if (!session) {
      return HttpResponse.json(
        { error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } },
        { status: 401 }
      );
    }

    const portfolios = loadedDatabase.portfolios.filter((p) => p.userId === session.userId);
    return HttpResponse.json({ success: true, data: portfolios }, { status: 200 });
  }),

  // 포트폴리오 생성
  http.post("/api/pension-portfolios", async ({ request }) => {
    await delay(300);

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return HttpResponse.json(
        { error: { code: "INVALID_TOKEN", message: "토큰이 없습니다" } },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const session = loadedDatabase.sessions.find((s) => s.token === token);
    if (!session) {
      return HttpResponse.json(
        { error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } },
        { status: 401 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (!isPortfolioItemArray(body.items) || !isValidAllocationSum(body.items)) {
      return HttpResponse.json(
        { error: { code: "INVALID_ALLOCATION_SUM", message: "포트폴리오 비중 합계는 100%여야 합니다" } },
        { status: 400 }
      );
    }

    const newPortfolio = {
      id: Math.max(0, ...loadedDatabase.portfolios.map((p) => p.id)) + 1,
      userId: session.userId,
      ...body,
    } as typeof loadedDatabase.portfolios[0];
    loadedDatabase.portfolios.push(newPortfolio);
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json(
      { success: true, data: newPortfolio },
      { status: 201 }
    );
  }),

  // 포트폴리오 조회
  http.get("/api/pension-portfolios/:id", async ({ params, request }) => {
    await delay(300);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json(
        { error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } },
        { status: 401 }
      );
    }

    const id = Number(params.id);
    const portfolio = loadedDatabase.portfolios.find((p) => p.id === id);
    if (!portfolio) {
      return HttpResponse.json(
        { error: { code: "PORTFOLIO_NOT_FOUND", message: "포트폴리오를 찾을 수 없습니다" } },
        { status: 404 }
      );
    }

    if (!isOwner(portfolio, session.userId)) {
      return HttpResponse.json(
        { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다" } },
        { status: 403 }
      );
    }

    return HttpResponse.json({ success: true, data: portfolio }, { status: 200 });
  }),

  // 포트폴리오 업데이트
  http.patch("/api/pension-portfolios/:id", async ({ params, request }) => {
    await delay(300);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json(
        { error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } },
        { status: 401 }
      );
    }

    const id = Number(params.id);
    const portfolio = loadedDatabase.portfolios.find((p) => p.id === id);
    if (!portfolio) {
      return HttpResponse.json(
        { error: { code: "PORTFOLIO_NOT_FOUND", message: "포트폴리오를 찾을 수 없습니다" } },
        { status: 404 }
      );
    }

    if (!isOwner(portfolio, session.userId)) {
      return HttpResponse.json(
        { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다" } },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (
      body.items !== undefined &&
      (!isPortfolioItemArray(body.items) || !isValidAllocationSum(body.items))
    ) {
      return HttpResponse.json(
        { error: { code: "INVALID_ALLOCATION_SUM", message: "포트폴리오 비중 합계는 100%여야 합니다" } },
        { status: 400 }
      );
    }

    Object.assign(portfolio, body);
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json({ success: true, data: portfolio }, { status: 200 });
  }),

  // 포트폴리오 삭제
  http.delete("/api/pension-portfolios/:id", async ({ params, request }) => {
    await delay(300);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json(
        { error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } },
        { status: 401 }
      );
    }

    const id = Number(params.id);
    const index = loadedDatabase.portfolios.findIndex((p) => p.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { error: { code: "PORTFOLIO_NOT_FOUND", message: "포트폴리오를 찾을 수 없습니다" } },
        { status: 404 }
      );
    }

    if (!isOwner(loadedDatabase.portfolios[index], session.userId)) {
      return HttpResponse.json(
        { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다" } },
        { status: 403 }
      );
    }

    loadedDatabase.portfolios.splice(index, 1);
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // 건강보험 시뮬레이션 생성
  http.post("/api/simulations/health-insurance", async ({ request }) => {
    await delay(500);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const newSimulation = {
      id: Math.max(0, ...loadedDatabase.simulations.map((s) => s.id)) + 1,
      userId: session.userId,
      type: "HEALTH_INSURANCE" as const,
      inputData: body,
      outputData: {
        recognizedAnnualIncome: 8400000,
        recognizedMonthlyIncome: 700000,
        incomePremium: 26040,
        propertyPremium: 0,
        carPremium: 0,
        canBeDependent: true,
        estimatedMonthlyPremium: 28890,
        notice: "월 소득 인정액이 336만원 이하이므로 피부양자 조건을 충족합니다.",
      },
      createdAt: new Date().toISOString(),
    } as typeof loadedDatabase.simulations[0];
    loadedDatabase.simulations.push(newSimulation);
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json({ success: true, data: newSimulation }, { status: 201 });
  }),

  // 최신 건강보험 시뮬레이션 조회
  http.get("/api/simulations/health-insurance/latest", async ({ request }) => {
    await delay(300);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const simulation = [...loadedDatabase.simulations]
      .filter((s) => s.userId === session.userId && s.type === "HEALTH_INSURANCE")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!simulation) {
      return HttpResponse.json(
        { error: { code: "HEALTH_INSURANCE_SIMULATION_NOT_FOUND", message: "저장된 결과가 없습니다" } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ success: true, data: simulation }, { status: 200 });
  }),

  // ISA 시뮬레이션 생성
  http.post("/api/simulations/isa", async ({ request }) => {
    await delay(500);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const newSimulation = {
      id: Math.max(0, ...loadedDatabase.simulations.map((s) => s.id)) + 1,
      userId: session.userId,
      type: "ISA" as const,
      inputData: body,
      outputData: {
        expectedProfit: 15000000,
        estimatedTaxSaving: 1125000,
        notice: "ISA 계좌 만기 해지 시 비과세 한도 초과분에 9.9% 분리과세가 적용됩니다.",
      },
      createdAt: new Date().toISOString(),
    } as typeof loadedDatabase.simulations[0];
    loadedDatabase.simulations.push(newSimulation);
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json({ success: true, data: newSimulation }, { status: 201 });
  }),

  // 최신 ISA 시뮬레이션 조회
  http.get("/api/simulations/isa/latest", async ({ request }) => {
    await delay(300);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const simulation = [...loadedDatabase.simulations]
      .filter((s) => s.userId === session.userId && s.type === "ISA")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!simulation) {
      return HttpResponse.json(
        { error: { code: "ISA_SIMULATION_NOT_FOUND", message: "저장된 결과가 없습니다" } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ success: true, data: simulation }, { status: 200 });
  }),

  // 국민연금 시뮬레이션 생성
  http.post("/api/simulations/national-pension", async ({ request }) => {
    await delay(500);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const newSimulation = {
      id: Math.max(0, ...loadedDatabase.simulations.map((s) => s.id)) + 1,
      userId: session.userId,
      type: "NATIONAL_PENSION" as const,
      inputData: body,
      outputData: {
        estimatedMonthlyPension: 980000,
        pensionStartAge: 65,
        notice: "1969년 이후 출생자의 국민연금 수급 개시 연령은 만 65세입니다.",
      },
      createdAt: new Date().toISOString(),
    } as typeof loadedDatabase.simulations[0];
    loadedDatabase.simulations.push(newSimulation);
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json({ success: true, data: newSimulation }, { status: 201 });
  }),

  // 최신 국민연금 시뮬레이션 조회
  http.get("/api/simulations/national-pension/latest", async ({ request }) => {
    await delay(300);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const simulation = [...loadedDatabase.simulations]
      .filter((s) => s.userId === session.userId && s.type === "NATIONAL_PENSION")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!simulation) {
      return HttpResponse.json(
        { error: { code: "NATIONAL_PENSION_SIMULATION_NOT_FOUND", message: "저장된 결과가 없습니다" } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ success: true, data: simulation }, { status: 200 });
  }),

  // IRP 시뮬레이션 생성
  http.post("/api/simulations/irp", async ({ request }) => {
    await delay(500);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const newSimulation = {
      id: Math.max(0, ...loadedDatabase.simulations.map((s) => s.id)) + 1,
      userId: session.userId,
      type: "IRP" as const,
      inputData: body,
      outputData: {
        expectedBalance: 280000000,
        annualTaxCredit: 924000,
        totalTaxCredit: 18480000,
        notice: "연 소득 5,500만원 이하 기준 세액공제율 16.5%가 적용됩니다.",
      },
      createdAt: new Date().toISOString(),
    } as typeof loadedDatabase.simulations[0];
    loadedDatabase.simulations.push(newSimulation);
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json({ success: true, data: newSimulation }, { status: 201 });
  }),

  // 최신 IRP 시뮬레이션 조회
  http.get("/api/simulations/irp/latest", async ({ request }) => {
    await delay(300);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const simulation = [...loadedDatabase.simulations]
      .filter((s) => s.userId === session.userId && s.type === "IRP")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!simulation) {
      return HttpResponse.json(
        { error: { code: "IRP_SIMULATION_NOT_FOUND", message: "저장된 결과가 없습니다" } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ success: true, data: simulation }, { status: 200 });
  }),

  // 퇴직금 시뮬레이션 생성
  http.post("/api/simulations/severance-pay", async ({ request }) => {
    await delay(500);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const newSimulation = {
      id: Math.max(0, ...loadedDatabase.simulations.map((s) => s.id)) + 1,
      userId: session.userId,
      type: "SEVERANCE_PAY" as const,
      inputData: body,
      outputData: {
        severancePay: 72000000,
        incomeTax: 3600000,
        afterTaxAmount: 68400000,
        notice: "근속연수 공제와 환산급여 공제 후 산출된 퇴직소득세 기준입니다.",
      },
      createdAt: new Date().toISOString(),
    } as typeof loadedDatabase.simulations[0];
    loadedDatabase.simulations.push(newSimulation);
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json({ success: true, data: newSimulation }, { status: 201 });
  }),

  // 최신 퇴직금 시뮬레이션 조회
  http.get("/api/simulations/severance-pay/latest", async ({ request }) => {
    await delay(300);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const simulation = [...loadedDatabase.simulations]
      .filter((s) => s.userId === session.userId && s.type === "SEVERANCE_PAY")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!simulation) {
      return HttpResponse.json(
        { error: { code: "SEVERANCE_PAY_SIMULATION_NOT_FOUND", message: "저장된 결과가 없습니다" } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ success: true, data: simulation }, { status: 200 });
  }),

  // 실업급여 시뮬레이션 생성
  http.post("/api/simulations/unemployment-benefit", async ({ request }) => {
    await delay(500);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const newSimulation = {
      id: Math.max(0, ...loadedDatabase.simulations.map((s) => s.id)) + 1,
      userId: session.userId,
      type: "UNEMPLOYMENT_BENEFIT" as const,
      inputData: body,
      outputData: {
        benefitDays: 270,
        dailyBenefit: 66000,
        monthlyBenefit: 1980000,
        totalBenefit: 17820000,
        notice: "50세 이상 고용보험 10년 이상 가입자 기준 소정급여일수 270일이 적용됩니다.",
      },
      createdAt: new Date().toISOString(),
    } as typeof loadedDatabase.simulations[0];
    loadedDatabase.simulations.push(newSimulation);
    setLocalStorage("mockDatabase", loadedDatabase);

    return HttpResponse.json({ success: true, data: newSimulation }, { status: 201 });
  }),

  // 최신 실업급여 시뮬레이션 조회
  http.get("/api/simulations/unemployment-benefit/latest", async ({ request }) => {
    await delay(300);

    const session = resolveSession(request.headers.get("Authorization"), loadedDatabase.sessions);
    if (!session) {
      return HttpResponse.json({ error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다" } }, { status: 401 });
    }

    const simulation = [...loadedDatabase.simulations]
      .filter((s) => s.userId === session.userId && s.type === "UNEMPLOYMENT_BENEFIT")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!simulation) {
      return HttpResponse.json(
        { error: { code: "UNEMPLOYMENT_BENEFIT_SIMULATION_NOT_FOUND", message: "저장된 결과가 없습니다" } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ success: true, data: simulation }, { status: 200 });
  }),
];

export default handlers;
