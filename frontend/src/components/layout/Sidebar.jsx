import React from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Copy,
  Clock,
  Settings,
  LogOut,
  FileText as LogoIcon,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockUser } from '../../data/mockData';

export const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'My Documents', icon: FileText, path: '/documents' },
    { label: 'Templates', icon: Copy, path: '/templates' },
    { label: 'Recent', icon: Clock, path: '/documents?filter=recent' },
    { label: 'Settings', icon: Settings, path: '/settings' }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Failed to log out:', err);
    }
    navigate('/login');
    if (onClose) onClose();
  };

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || mockUser.name;
  const userEmail = currentUser?.email || mockUser.email;

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-slate-900 text-slate-300">
      <div>
        {/* Header & Logo */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-800">
          <Link to="/dashboard" className="flex items-center space-x-2.5 text-white">
            <LogoIcon className="h-6 w-6 text-brand-400" />
            <span className="text-lg font-bold tracking-tight">Doc<span className="text-brand-400">AI</span></span>
          </Link>
          {onClose && (
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white p-1">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation links */}
        <nav className="mt-6 px-4 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = item.path.includes('?') 
              ? location.pathname + location.search === item.path
              : location.pathname === item.path && !location.search.includes('filter=recent');

            return (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-900/10'
                    : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`}
              >
                <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-800 space-y-4">
        {/* User Card */}
        <div className="flex items-center space-x-3 px-2 py-1">
          <div className="h-9 w-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm border border-brand-400/20 shadow-sm">
            {getInitials(userName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{userName}</p>
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-950/30 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Desktop/Drawer Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-900 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
