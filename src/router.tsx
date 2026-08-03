import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import WelcomeScreen from "./screens/WelcomeScreen";
import DiagnosisTypeScreen from "./screens/DiagnosisTypeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import CashflowInputScreen from "./screens/CashflowInputScreen";
import ScenarioScreen from "./screens/ScenarioScreen";
import MedicalExpenseScreen from "./screens/MedicalExpenseScreen";
import ProjectionScreen from "./screens/ProjectionScreen";
import SummaryScreen from "./screens/SummaryScreen";
import SignInScreen from "./screens/SignInScreen";
import SignUpScreen from "./screens/SignUpScreen";
import AccountScreen from "./screens/AccountScreen";
import CashFlowPlanScreen from "./screens/CashFlowPlanScreen";
import SimulationMenuScreen from "./screens/SimulationMenuScreen";
import HealthInsuranceSimulationScreen from "./screens/HealthInsuranceSimulationScreen";
import IsaSimulationScreen from "./screens/IsaSimulationScreen";
import NationalPensionSimulationScreen from "./screens/NationalPensionSimulationScreen";
import IrpSimulationScreen from "./screens/IrpSimulationScreen";
import SeverancePaySimulationScreen from "./screens/SeverancePaySimulationScreen";
import PortfolioScreen from "./screens/PortfolioScreen";
import SimulationDashboardScreen from "./screens/SimulationDashboardScreen";
import UnemploymentBenefitSimulationScreen from "./screens/UnemploymentBenefitSimulationScreen";
import HousingPensionSimulationScreen from "./screens/HousingPensionSimulationScreen";
import PrivacyScreen from "./screens/PrivacyScreen";
import TermsScreen from "./screens/TermsScreen";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <WelcomeScreen /> },
      { path: "diagnosis", element: <DiagnosisTypeScreen /> },
      { path: "profile", element: <ProfileScreen /> },
      { path: "cashflow", element: <CashflowInputScreen /> },
      { path: "scenario", element: <ScenarioScreen /> },
      { path: "medical", element: <MedicalExpenseScreen /> },
      // 게스트도 결과 열람 가능 — 저장만 로그인 요구
      { path: "result", element: <ProjectionScreen /> },
      {
        path: "summary",
        element: (
          <ProtectedRoute>
            <SummaryScreen />
          </ProtectedRoute>
        ),
      },
      { path: "signin", element: <SignInScreen /> },
      { path: "signup", element: <SignUpScreen /> },
      { path: "privacy", element: <PrivacyScreen /> },
      { path: "terms", element: <TermsScreen /> },
      {
        path: "account",
        element: (
          <ProtectedRoute>
            <AccountScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: "cashflow-plan",
        element: (
          <ProtectedRoute>
            <CashFlowPlanScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: "simulation",
        element: (
          <ProtectedRoute>
            <SimulationMenuScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: "simulation/health-insurance",
        element: (
          <ProtectedRoute>
            <HealthInsuranceSimulationScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: "simulation/isa",
        element: (
          <ProtectedRoute>
            <IsaSimulationScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: "simulation/national-pension",
        element: (
          <ProtectedRoute>
            <NationalPensionSimulationScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: "simulation/irp",
        element: (
          <ProtectedRoute>
            <IrpSimulationScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: "simulation/severance-pay",
        element: (
          <ProtectedRoute>
            <SeverancePaySimulationScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: "portfolio",
        element: (
          <ProtectedRoute>
            <PortfolioScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: "simulation/unemployment-benefit",
        element: (
          <ProtectedRoute>
            <UnemploymentBenefitSimulationScreen />
          </ProtectedRoute>
        ),
      },
      // 진단 중 주택연금: 게스트는 로컬 계산, 저장/불러오기는 로그인
      { path: "simulation/housing-pension", element: <HousingPensionSimulationScreen /> },
      {
        path: "simulation/dashboard",
        element: (
          <ProtectedRoute>
            <SimulationDashboardScreen />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
