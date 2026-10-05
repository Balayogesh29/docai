import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Footer } from '../components/layout/Footer';

export const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header/Navbar */}
      <header className="py-6 px-8 border-b border-slate-200/60 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-brand-600" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">Doc<span className="text-brand-600">AI</span></span>
          </Link>
          <Link to="/" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main card wrapper */}
      <main className="flex-grow flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-premium p-8 sm:p-10">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
