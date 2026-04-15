import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitials, getRoleLabel } from '../utils/formatters';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = getNavItems(user?.role);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">LM</div>
          <div>
            <div className="sidebar-brand-text">Labor Manager</div>
            <div className="sidebar-brand-sub">Quản lý nhân công</div>
          </div>
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

      {/* Main */}
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

  if (role === 'ADMIN') {
    items.push({
      title: 'Quản lý',
      links: [
        { to: '/users', label: 'Nhân viên', icon: '👥' },
        { to: '/projects', label: 'Dự án', icon: '📁' },
      ]
    });
  }

  items.push({
    title: 'Báo cáo',
    links: [
      { to: '/reports', label: 'Báo cáo tài chính', icon: '💰' },
    ]
  });

  return items;
}
