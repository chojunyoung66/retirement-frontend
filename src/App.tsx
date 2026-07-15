import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from './hooks/useAuth';
import Toast from './components/Toast';
import { showToast } from './store/toast-slice';
import type { AppDispatch } from './store/store';
import logo from './assets/logo.png';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, logout } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleAuthClick = () => {
    if (isLoggedIn) {
      logout();
      dispatch(showToast('로그아웃되었어요'));
    } else {
      navigate('/signin', { state: { from: location.pathname } });
    }
  };

  const handleTitleClick = () => navigate('/');
  const isHome = location.pathname === '/';

  return (
    <div className="screen">
      <header className="app-header">
        <div className="header-left">
          {!isHome && (
            <button className="header-back-btn" onClick={() => navigate(-1)} aria-label="뒤로">
              ←
            </button>
          )}
        </div>
        <button className="header-link header-center" onClick={handleTitleClick}>
          <img src={logo} alt="로고" className="header-logo" />
          은퇴현금 설계센터
        </button>
        <div className="app-header-actions header-right">
          <button className="header-link" onClick={handleAuthClick}>
            {isLoggedIn ? '로그아웃' : '로그인'}
          </button>
        </div>
      </header>
      <Outlet />
      <footer className="app-footer">
        © 2026 은퇴현금 설계센터 · 진단은 참고용 예측입니다.
      </footer>
      <Toast />
    </div>
  );
}
