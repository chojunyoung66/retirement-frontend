import { useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "./hooks/useAuth";
import Toast from "./components/Toast";
import { showToast } from "./store/toast-slice";
import type { AppDispatch } from "./store/store";
import logo from "./assets/logo.png";
import { warmBackend } from "./utils/warm-backend";
import {
  captureUtmFromLocation,
  identifyUser,
  setUserProperties,
  trackPageView,
} from "./analytics";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, logout, checkAuth, user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  // Render 콜드스타트 완화 후 세션 확인
  useEffect(() => {
    warmBackend();
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SPA page_view는 Router 한 지점에서만 전송
  useEffect(() => {
    window.scrollTo(0, 0);
    const utm = captureUtmFromLocation(location.search);
    if (utm.utm_source || utm.utm_campaign) {
      setUserProperties({
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
      });
    }
    trackPageView(location.pathname);
  }, [location.pathname, location.search]);

  // 로그인 상태를 Amplitude user_id·User Property에 반영
  useEffect(() => {
    identifyUser(isLoggedIn && user?.id != null ? String(user.id) : null);
    setUserProperties({
      auth_status: isLoggedIn ? "logged_in" : "guest",
    });
  }, [isLoggedIn, user?.id]);

  const handleAuthClick = async () => {
    if (isLoggedIn) {
      await logout();
      dispatch(showToast("로그아웃되었어요"));
    } else {
      navigate("/signin", { state: { from: location.pathname } });
    }
  };

  const handleTitleClick = () => navigate("/");
  const isHome = location.pathname === "/";

  return (
    <div className={isHome ? "screen screen-home" : "screen"}>
      <header className="app-header">
        <div className="header-left">
          {!isHome && (
            <button
              className="header-back-btn"
              onClick={() => navigate(-1)}
              aria-label="뒤로"
            >
              ←
            </button>
          )}
        </div>
        <button
          className="header-link header-center"
          onClick={handleTitleClick}
        >
          <img src={logo} alt="로고" className="header-logo" />
          은퇴현금 설계센터
        </button>
        <div className="app-header-actions header-right">
          <button className="header-link" onClick={handleAuthClick}>
            {isLoggedIn ? "로그아웃" : "로그인"}
          </button>
        </div>
      </header>
      <Outlet />
      <footer className="app-footer">
        <p>© 2026 은퇴현금 설계센터 · 진단은 참고용 예측입니다.</p>
        <p className="app-footer-links">
          <Link to="/privacy">개인정보처리방침</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/terms">이용약관</Link>
        </p>
      </footer>
      <Toast />
    </div>
  );
}
