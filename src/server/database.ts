export type Session = {
  token: string;
  userId: number;
  email: string;
};

export type User = {
  id: number;
  email: string;
  password: string;
  name: string;
};

export type RetirementGoal = {
  id: number;
  userId: number;
  birthYear: number;
  retirementYear: number;
  monthlyLivingExpense: number;
  nationalPension: number;
  retirementAsset: number;
};

export type PortfolioItem = {
  symbol: string;
  name: string;
  allocation: number;
};

export type Portfolio = {
  id: number;
  userId: number;
  accountType: string;
  name: string;
  items: PortfolioItem[];
};

export type Simulation = {
  id: number;
  userId: number;
  type: "HEALTH_INSURANCE" | "ISA";
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  createdAt: string;
};

export type Database = {
  sessions: Session[];
  users: User[];
  retirementGoals: RetirementGoal[];
  portfolios: Portfolio[];
  simulations: Simulation[];
};

const database: Database = {
  sessions: [],
  users: [
    {
      id: 1,
      email: "user@example.com",
      password: "password123",
      name: "테스트 사용자",
    },
  ],
  retirementGoals: [
    {
      id: 1,
      userId: 1,
      birthYear: 1985,
      retirementYear: 2055,
      monthlyLivingExpense: 3000000,
      nationalPension: 2000000,
      retirementAsset: 500000000,
    },
  ],
  portfolios: [
    {
      id: 1,
      userId: 1,
      accountType: "IRP",
      name: "안정형 포트폴리오",
      items: [
        { symbol: "BOND", name: "채권 ETF", allocation: 60 },
        { symbol: "STOCK", name: "주식 ETF", allocation: 40 },
      ],
    },
  ],
  simulations: [
    {
      id: 1,
      userId: 1,
      type: "HEALTH_INSURANCE",
      inputData: { income: 50000000 },
      outputData: { monthlyPremium: 450000, yearlyPremium: 5400000 },
      createdAt: new Date().toISOString(),
    },
  ],
};

export default database;
