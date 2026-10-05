import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Sliders, Moon, Sun, Save, LogOut } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { mockUser } from '../data/mockData';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile form state
  const [fullName, setFullName] = useState(mockUser.name);
  const [email, setEmail] = useState(mockUser.email);
  
  // Preferences form state
  const [theme, setTheme] = useState(mockUser.preferences.theme);
  const [defaultDocType, setDefaultDocType] = useState(mockUser.preferences.defaultDocType);
  const [autoSave, setAutoSave] = useState(mockUser.preferences.editorAutoSave);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      mockUser.name = fullName;
      mockUser.email = email;
      setIsSaving(false);
      setMessage('Profile settings updated successfully.');
      setTimeout(() => setMessage(''), 3000);
    }, 600);
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      mockUser.preferences.theme = theme;
      mockUser.preferences.defaultDocType = defaultDocType;
      mockUser.preferences.editorAutoSave = autoSave;
      setIsSaving(false);
      setMessage('Preferences saved.');
      setTimeout(() => setMessage(''), 3000);
    }, 500);
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    { id: 'security', label: 'Security & Account', icon: Shield }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Title */}
        <div className="border-b border-slate-200 pb-4 space-y-1">
          <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">Account Settings</h2>
          <p className="text-xs text-slate-500">Configure profile, preferences, and editor configurations</p>
        </div>

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 text-center animate-fade-in">
            {message}
          </div>
        )}

        {/* Layout: Tabs Sidebar + Form Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Tabs Menu */}
          <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <nav className="flex flex-col">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMessage(''); }}
                  className={`flex items-center space-x-3 px-4 py-3.5 border-l-2 text-xs font-semibold uppercase tracking-wider transition-all text-left ${
                    activeTab === tab.id
                      ? 'border-brand-600 bg-brand-50/30 text-brand-600'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <tab.icon className="h-4.5 w-4.5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Form Content Area */}
          <div className="md:col-span-8">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <Card title="Public Profile" subtitle="Update your academic credentials and contact information">
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="h-14 w-14 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                      {fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-950">{fullName}</h4>
                      <p className="text-xs text-slate-400">Profile Picture will be connected in Phase 9</p>
                    </div>
                  </div>

                  <Input
                    label="Full Name"
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <div className="pt-2">
                    <Button type="submit" isLoading={isSaving} icon={Save}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === 'preferences' && (
              <Card title="Editor Preferences" subtitle="Customize the document layout and theme parameters">
                <form onSubmit={handleSavePreferences} className="space-y-5">
                  
                  {/* Theme Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Interface Theme
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        onClick={() => setTheme('light')}
                        className={`p-4 border rounded-xl flex items-center justify-center space-x-2.5 cursor-pointer transition-all ${
                          theme === 'light'
                            ? 'border-brand-600 bg-brand-50/20 text-brand-655 text-brand-600'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        <Sun className="h-4.5 w-4.5" />
                        <span className="text-xs font-semibold">Light Mode</span>
                      </div>
                      <div
                        onClick={() => setTheme('dark')}
                        className={`p-4 border rounded-xl flex items-center justify-center space-x-2.5 cursor-pointer transition-all ${
                          theme === 'dark'
                            ? 'border-brand-600 bg-brand-50/20 text-brand-655 text-brand-600'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        <Moon className="h-4.5 w-4.5" />
                        <span className="text-xs font-semibold">Dark Mode</span>
                      </div>
                    </div>
                  </div>

                  {/* Default Document Selector */}
                  <div className="space-y-2">
                    <label htmlFor="defaultDoc" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Default Document Type
                    </label>
                    <select
                      id="defaultDoc"
                      value={defaultDocType}
                      onChange={(e) => setDefaultDocType(e.target.value)}
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="Research Paper">Research Paper</option>
                      <option value="Project Report">Project Report</option>
                      <option value="Technical Documentation">Technical Documentation</option>
                      <option value="Proposal">Proposal</option>
                    </select>
                  </div>

                  {/* Auto Save checkbox Toggle */}
                  <div className="flex items-center space-x-3 pt-2">
                    <input
                      id="autoSave"
                      type="checkbox"
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      className="h-4.5 w-4.5 text-brand-600 focus:ring-brand-500 border-slate-300 rounded"
                    />
                    <label htmlFor="autoSave" className="text-xs font-medium text-slate-700 select-none">
                      Enable document Auto-Save every 30 seconds
                    </label>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" isLoading={isSaving} icon={Save}>
                      Save Preferences
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <Card title="Account Administration" subtitle="Manage credentials and system credentials status">
                <div className="space-y-6">
                  
                  {/* Database Information alert */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Database Mode</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      This application is running in local demonstration mode. PostgreSQL connection through SQLAlchemy/Supabase is scheduled for integration in Phase 4 & 5.
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <Button
                      variant="danger"
                      className="justify-center"
                      onClick={handleLogout}
                      icon={LogOut}
                    >
                      Sign Out of All Sessions
                    </Button>
                  </div>
                </div>
              </Card>
            )}

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};
