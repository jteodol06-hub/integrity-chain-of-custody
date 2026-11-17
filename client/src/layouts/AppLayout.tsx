import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  FolderLock,
  Database,
  FileCheck2,
  Link2,
  ScrollText,
  Users,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Investigations', path: '/cases', icon: FolderLock },
    { label: 'Evidence Vault', path: '/evidence', icon: Database },
    { label: 'Integrity Verification', path: '/verification', icon: FileCheck2 },
    { label: 'Chain of Custody', path: '/custody', icon: Link2 },
    { label: 'Audit Trail', path: '/audit', icon: ScrollText },
    ...(user?.role === 'ADMIN' ? [{ label: 'User Management', path: '/users', icon: Users }] : []),
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#06020c]/80 text-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#101827]/90 backdrop-blur-md border-r border-[#263449] flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Logo & Product Brand */}
          <div className="p-5 border-b border-[#263449] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-mono">ICCF</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-semibold uppercase">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] truncate max-w-[150px]">Evidence Custody</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#151F30]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-[#94A3B8]'}`} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout at bottom of sidebar */}
        <div className="p-4 border-t border-[#263449]">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#151F30] border border-[#263449]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">
                {user?.fullName?.slice(0, 2) || 'US'}
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-white truncate">{user?.fullName}</p>
                <p className="text-[10px] text-sky-400 font-mono uppercase">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-[#101827]/85 backdrop-blur-md border-b border-[#263449] px-6 flex items-center justify-between flex-shrink-0">
          {/* Global Search Bar */}
          <div className="relative w-96">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cases, evidence, SHA-256 hashes..."
              className="w-full bg-[#151F30] border border-[#263449] rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Quick Actions & Profile */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/cases?new=true')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> New Case
            </button>

            <button
              onClick={() => navigate('/evidence?register=true')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B2940] hover:bg-[#223552] border border-[#263449] text-sky-400 rounded-lg text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Register Evidence
            </button>

            <div className="h-4 w-px bg-[#263449]" />

            <button
              title="Notifications"
              className="relative p-2 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#151F30] transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-sky-400 absolute top-1.5 right-1.5" />
            </button>

            {/* Profile Avatar Pill */}
            <div className="flex items-center gap-2 pl-2">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-400">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <span className="text-xs text-white font-medium">{user?.fullName}</span>
            </div>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 overflow-y-auto p-8 bg-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
