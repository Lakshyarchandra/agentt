import { NavLink, useNavigate } from 'react-router-dom';
import { Bot, LayoutDashboard, History, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-logo">
        <div className="navbar-logo-icon">
          <Bot size={16} color="white" />
        </div>
        <span>Agent Studio</span>
      </NavLink>

      <div className="navbar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={15} />
          Dashboard
        </NavLink>
        <NavLink to="/traces" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <History size={15} />
          Traces
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={15} />
          Settings
        </NavLink>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.3rem 0.75rem',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}>
          <div style={{
            width: 20, height: 20,
            background: 'var(--gradient-primary)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 700, color: 'white',
          }}>
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="truncate" style={{ maxWidth: 140 }}>{user?.full_name || user?.email}</span>
        </div>
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={handleLogout}
          data-tooltip="Logout"
          id="btn-logout"
        >
          <LogOut size={15} />
        </button>
      </div>
    </nav>
  );
}
