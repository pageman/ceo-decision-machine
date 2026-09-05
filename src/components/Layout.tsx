import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';

const NAV_MAIN = [
  { to: '/', label: 'Dashboard', icon: '⌂', end: true },
  { to: '/companies', label: 'Companies', icon: '▦' },
  { to: '/evidence', label: 'Evidence', icon: '◈' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

const ID_SECTIONS = new Set(['analyze', 'companies', 'sobol', 'fermi', 'recommendation', 'pilot']);

export function Layout() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const contextId =
    segments.length >= 2 && ID_SECTIONS.has(segments[0]) && segments[1] !== 'new'
      ? segments[1]
      : undefined;
  const contextName = useAppStore((s) =>
    contextId ? s.companies.find((c) => c.id === contextId)?.name : undefined,
  );

  return (
    <>
      <header className="app-header">
        <span className="brand">CEO Decision Machine</span>
        {contextName ? <span className="context">/ {contextName}</span> : null}
      </header>
      <div className="app-shell">
        <nav className="app-sidebar" aria-label="Primary">
          {NAV_MAIN.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="nav-section">Analyze</div>
          <NavLink to="/analyze/new" className={({ isActive }) => (isActive ? 'active' : '')}>
            + New Analysis
          </NavLink>
        </nav>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <nav className="app-tabbar" aria-label="Primary mobile">
        {NAV_MAIN.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="tab-icon" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
