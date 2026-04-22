import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitials, getRoleLabel } from '../utils/formatters';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar when route changes (on mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const navItems = getNavItems(user?.role);

  return (
    <div className="app-layout">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <button className="hamburger-btn" onClick={toggleSidebar}>
          {isSidebarOpen ? '✕' : '☰'}
        </button>
        <div className="mobile-brand">
          <div className="sidebar-brand-icon" style={{ width: 32, height: 32, fontSize: '0.9rem' }}>LM</div>
          <span className="sidebar-brand-text" style={{ fontSize: '1rem' }}>Labor Manager</span>
        </div>
        <div className="sidebar-user-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
          {getInitials(user?.full_name)}
        </div>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar Container */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">LM</div>
          <div>
            <div className="sidebar-brand-text">Labor Manager</div>
            <div className="sidebar-brand-sub">Quản lý nhân công</div>
          </div>
          {/* Close button inside sidebar for mobile */}
          <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section, i) => (
            <div className="sidebar-section" key={i}>
              <div className="sidebar-section-title">{section.title}</div>
              {section.links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="sidebar-link-icon">{link.icon}</span>
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {getInitials(user?.full_name)}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name}</div>
            <div className="sidebar-user-role">{getRoleLabel(user?.role)}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout} title="Đăng xuất">
            ⏻
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function getNavItems(role) {
  if (role === 'STAFF') {
    return [
      {
        title: 'Công việc',
        links: [
          { to: '/worklog', label: 'Chấm công', icon: '⏱' },
        ]
      }
    ];
  }

  const items = [
    {
      title: 'Tổng quan',
      links: [
        { to: '/dashboard', label: 'Dashboard', icon: '📊' },
        { to: '/live-monitor', label: 'Theo dõi Live', icon: '🔴' },
      ]
    }
  ];

  if (role === 'ADMIN' || role === 'ACCOUNTANT') {
    items.push({
      title: 'Quản lý',
      links: [
        { to: '/project-items', label: 'Quản lý Hạng mục', icon: '📚' },
        { to: '/tasks', label: 'Quản lý Task', icon: '📝' },
        ...(role === 'ADMIN' ? [
          { to: '/users', label: 'Nhân viên', icon: '👥' },
          { to: '/projects', label: 'Dự án', icon: '📁' },
        ] : [])
      ]
    });
  }

  items.push({
    title: 'Báo cáo',
    links: [
      { to: '/reports', label: 'Báo cáo Chi phí', icon: '💰' },
      { to: '/attendance-report', label: 'Báo cáo chấm công', icon: '📅' },
    ]
  });

  return items;
}
