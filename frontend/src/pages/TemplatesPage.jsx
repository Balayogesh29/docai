import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Sparkles, BookOpen, FileText } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/States';
import { api } from '../services/api';

export const TemplatesPage = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoading(true);
        const data = await api.getTemplates();
        setTemplates(data);
      } catch (err) {
        console.error("Failed to load templates:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplates();
  }, []);

  const handleUseTemplate = (templateTitle, category) => {
    navigate(`/create?template=${encodeURIComponent(templateTitle)}&type=${encodeURIComponent(category)}`);
  };

  const categories = ['All', ...new Set(templates.map(t => t.category))];

  const filteredTemplates = activeCategory === 'All'
    ? templates
    : templates.filter(t => t.category === activeCategory);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header Title */}
        <div className="border-b border-slate-200 pb-4 space-y-1">
          <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">Document Templates</h2>
          <p className="text-xs text-slate-500">Accelerate your workflow with pre-configured structural layouts</p>
        </div>

        {/* Tab Filters */}
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar scroll-smooth">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-4 py-2 border-b-2 text-xs font-semibold uppercase tracking-wider transition-colors mr-4 ${
                activeCategory === category
                  ? 'border-brand-655 border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-400 hover:text-slate-655 hover:text-slate-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Templates Grid List */}
        {isLoading ? (
          <LoadingState message="Fetching system templates..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((tpl) => (
              <Card
                key={tpl.id}
                title={tpl.title}
                subtitle={tpl.category}
                bodyClassName="p-5 flex flex-col justify-between h-40"
              >
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                  {tpl.description}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-center group"
                  onClick={() => handleUseTemplate(tpl.title, tpl.category)}
                  icon={Copy}
                >
                  Use Template
                </Button>
              </Card>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};
