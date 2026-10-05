import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockUser } from '../../data/mockData';

export const Header = ({ onMenuToggle }) => {
  const location = useLocation();
  const { currentUser } = useAuth();

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || mockUser.name;

  // Determine page title based on current path
  const getPageTitle = () => {
    const path = location.pathname;
    const search = location.search;
    
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/documents') {
      if (search.includes('filter=recent')) return 'Recent Documents';
      return 'My Documents';
    }
    if (path === '/templates') return 'Templates';
    if (path === '/settings') return 'Settings';
    if (path === '/create') return 'Create Document';
    return 'DocAI';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="sticky top-0 right-0 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-30 shadow-sm">
      {/* Left side: Hamburger (mobile only) & Title */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuToggle}
          className="md:hidden text-slate-600 hover:text-slate-900 p-1.5 hover:bg-slate-100 rounded-lg focus:outline-none"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{getPageTitle()}</h1>
      </div>

      {/* Right side: Search, Notifications, Avatar */}
      <div className="flex items-center space-x-5">
        {/* Mock Search Bar (Desktop only) */}
        <div className="hidden sm:flex items-center relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search documents, templates..."
            className="pl-9 pr-4 py-1.5 w-60 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Notifications Icon */}
        <button className="relative text-slate-500 hover:text-slate-800 p-1.5 hover:bg-slate-50 rounded-lg focus:outline-none">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white"></span>
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200"></div>

        {/* User initials representation */}
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {getInitials(userName)}
          </div>
          <span className="hidden sm:inline text-xs font-semibold text-slate-700">{userName}</span>
        </div>
      </div>
    </header>
  );
};
