import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  ArrowRight,
  BookOpen,
  FileSpreadsheet,
  Cpu,
  BarChart3,
  Building,
  FileSignature,
  Clock,
  Sparkles,
  FileText
} from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/States';
import { documentService } from '../services/documentService';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const docsData = await documentService.getDocuments();
        setRecentDocs(docsData.slice(0, 3));

        const totalDocs = docsData.length;
        setStats({
          totalDocuments: totalDocs,
          drafts: totalDocs,
          completed: 0,
          thisMonth: totalDocs,
        });
      } catch (err) {
        console.error("Failed to load dashboard documents:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const quickCreateOptions = [
    { title: 'Research Paper', icon: BookOpen, type: 'Research Paper', color: 'bg-indigo-50 text-indigo-600' },
    { title: 'Project Report', icon: FileSpreadsheet, type: 'Project Report', color: 'bg-emerald-50 text-emerald-600' },
    { title: 'Technical Docs', icon: Cpu, type: 'Technical Documentation', color: 'bg-amber-50 text-amber-600' },
    { title: 'Business Report', icon: BarChart3, type: 'Business Report', color: 'bg-rose-50 text-rose-600' },
    { title: 'Company Profile', icon: Building, type: 'Company Profile', color: 'bg-sky-50 text-sky-600' },
    { title: 'Proposal', icon: FileSignature, type: 'Proposal', color: 'bg-purple-50 text-purple-600' }
  ];

  const handleQuickCreate = (type) => {
    navigate(`/create?type=${encodeURIComponent(type)}`);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Recently';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Configuring dashboard metrics..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-brand-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Welcome back 👋</h2>
            <p className="text-xs sm:text-sm text-brand-200 max-w-md leading-relaxed">
              DocAI framework is ready. What kind of academic or technical document would you like to design today?
            </p>
          </div>
          <Link to="/create" className="w-full sm:w-auto">
            <Button
              className="bg-white hover:bg-slate-50 text-brand-900 font-bold w-full sm:w-auto shadow-md"
              icon={Plus}
            >
              Create New Document
            </Button>
          </Link>
        </div>

        {/* Statistics Widgets */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Documents', value: stats.totalDocuments, color: 'text-brand-600' },
              { label: 'Drafts', value: stats.drafts, color: 'text-amber-500' },
              { label: 'Completed', value: stats.completed, color: 'text-emerald-500' },
              { label: 'This Month', value: stats.thisMonth, color: 'text-indigo-500' }
            ].map((stat, idx) => (
              <Card key={idx} bodyClassName="p-4 sm:p-5 flex flex-col space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</span>
                <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${stat.color}`}>
                  {stat.value}
                </span>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Create Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Quick Create</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickCreateOptions.map((opt, idx) => (
              <div
                key={idx}
                onClick={() => handleQuickCreate(opt.type)}
                className="bg-white border border-slate-200 hover:border-brand-400 hover:shadow-premium p-4 rounded-xl flex flex-col items-center text-center cursor-pointer transition-all duration-200 group"
              >
                <div className={`p-3 rounded-lg ${opt.color} group-hover:scale-105 transition-transform mb-3`}>
                  <opt.icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 leading-tight group-hover:text-slate-900">
                  {opt.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Split Grid: Recent Documents & Workspace News */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Recent Documents Table List */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Documents</h3>
              <Link to="/documents" className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            
            {recentDocs.length === 0 ? (
              <Card bodyClassName="p-6 text-center text-xs text-slate-500">
                No documents created yet. Click "Create New Document" to get started!
              </Card>
            ) : (
              <div className="space-y-3.5">
                {recentDocs.map((doc) => (
                  <Card
                    key={doc.id}
                    hoverable
                    onClick={() => navigate(`/editor?id=${doc.id}`, { state: { id: doc.id, title: doc.title } })}
                    bodyClassName="p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 flex-shrink-0">
                        <FileText className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">{doc.title}</h4>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                          <span>{doc.doc_type || 'Custom'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDate(doc.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="info" className="flex-shrink-0">
                      Active
                    </Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Co-Writing Guide / Phase Status */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Phase Info</h3>
            <Card bodyClassName="p-5 space-y-4 bg-white">
              <div className="flex items-center space-x-2 text-brand-600 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                <span>DocAI Workspace</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-slate-500">
                You are running <strong>Phase 4E (React ↔ FastAPI Backend Integration)</strong>. Real-time Firebase Authentication, Firestore document persistence, and Cloud Storage reference file uploads are fully connected.
              </p>
              <div className="border-t border-slate-100 pt-4 space-y-2.5 text-[11px] text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  <span>Firebase Auth & Token Verification: Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
                  <span>Firestore Persistence: Connected</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                  <span>Firebase Storage Uploads: Active</span>
                </div>
              </div>
            </Card>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};
