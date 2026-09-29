import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

export default function AppShell({ navItems, portalLabel }: { navItems: NavItem[]; portalLabel: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col lg:flex-row">
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-line bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display font-semibold text-sm">VaultPay</span>
        </div>
        <button
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-md border border-line"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          ${menuOpen ? 'block' : 'hidden'} lg:block
          w-full lg:w-64 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-line bg-white
          lg:sticky lg:top-0 lg:h-screen
        `}
      >
        <div className="hidden lg:flex items-center gap-2.5 px-6 h-16 border-b border-line">
          <Logo />
          <div className="leading-tight">
            <div className="font-display font-semibold text-sm">VaultPay</div>
            <div className="text-[11px] text-ink-700/50">{portalLabel}</div>
          </div>
        </div>

        <nav className="px-3 py-4 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-ink text-white' : 'text-ink-700/70 hover:bg-paper-muted'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 mt-auto lg:absolute lg:bottom-0 lg:left-0 lg:right-0 py-4 border-t border-line">
          <div className="px-3 mb-2 text-xs text-ink-700/50 truncate">{user?.name} · {user?.email}</div>
          <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-md text-sm font-medium text-vault-rust hover:bg-vault-rust/5 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Logo() {
  return (
    <div className="w-8 h-8 rounded-md bg-ink flex items-center justify-center shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M4 12l6 6L20 6" stroke="#2E6F5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
