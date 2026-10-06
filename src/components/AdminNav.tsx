import { NavLink } from 'react-router-dom';

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  fontWeight: isActive ? 700 : 500,
  textDecoration: isActive ? 'underline' : 'none',
});

export default function AdminNav() {
  return (
    <nav className="card" style={{ display: 'flex', gap: 16 }} aria-label="운영자 메뉴">
      <strong>운영</strong>
      <NavLink to="/admin/reviews" style={linkStyle}>
        검토 요청
      </NavLink>
      <NavLink to="/admin/payments" style={linkStyle}>
        결제·환불
      </NavLink>
    </nav>
  );
}
