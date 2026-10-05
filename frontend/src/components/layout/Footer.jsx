import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-white">
              <FileText className="h-6 w-6 text-brand-400" />
              <span className="text-xl font-bold tracking-tight">Doc<span className="text-brand-400">AI</span></span>
            </div>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              Context-aware AI document creation and editing platform designed for academic and professional excellence.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#document-types" className="hover:text-white transition-colors">Document Types</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#about" className="hover:text-white transition-colors">Research</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
            </ul>
          </div>

          {/* Account links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Account</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Register</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>&copy; {new Date().getFullYear() === 2026 ? '2026' : '2026'} DocAI. All rights reserved.</p>
          <div className="flex space-x-6">
            <span className="cursor-not-allowed">Terms of Service</span>
            <span className="cursor-not-allowed">Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
