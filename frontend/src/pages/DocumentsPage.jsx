import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Plus, Clock, ArrowUpDown } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState, EmptyState } from '../components/common/States';
import { documentService } from '../services/documentService';

export const DocumentsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('recent'); // recent, name-asc, name-desc

  // Read URL query parameters (e.g. ?filter=recent)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const filter = searchParams.get('filter');
    if (filter === 'recent') {
      setSortBy('recent');
    }
  }, [location.search]);

  // Load documents from Firestore backend
  useEffect(() => {
    const loadDocs = async () => {
      try {
        setIsLoading(true);
        const data = await documentService.getDocuments();
        setDocuments(data);
      } catch (err) {
        console.error("Failed to load documents from backend:", err);
        setDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadDocs();
  }, []);

  // Apply search, filter, and sort
  useEffect(() => {
    let result = [...documents];

    // Search query filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        doc =>
          doc.title?.toLowerCase().includes(query) ||
          (typeof doc.content === 'string' && doc.content.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (typeFilter !== 'All') {
      result = result.filter(doc => doc.doc_type === typeFilter);
    }

    // Sort
    if (sortBy === 'name-asc') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    }

    setFilteredDocs(result);
  }, [documents, searchQuery, typeFilter, sortBy]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setTypeFilter('All');
    setSortBy('recent');
    navigate('/documents'); // Clear query params
  };

  // Extract formatted date from ISO string
  const formatDate = (isoString) => {
    if (!isoString) return 'Recently';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const docTypes = ['All', ...new Set(documents.map(d => d.doc_type).filter(Boolean))];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header section with Create CTA */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">All Documents</h2>
            <p className="text-xs text-slate-500">Manage, sort, and edit your document workspace models</p>
          </div>
          <Link to="/create" className="w-full sm:w-auto">
            <Button size="sm" icon={Plus}>New Document</Button>
          </Link>
        </div>

        {/* Search and Filters panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            
            {/* Text Search Input */}
            <div className="relative flex-grow">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search documents by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
              />
            </div>

            {/* Filter selectors */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:flex gap-3">
              {/* Type Filter */}
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="All">All Types</option>
                  {docTypes.filter(t => t !== 'All').map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Sort selector */}
              <div className="flex items-center space-x-2 col-span-2 sm:col-span-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-full"
                >
                  <option value="recent">Recently Edited</option>
                  <option value="name-asc">Alphabetical (A-Z)</option>
                  <option value="name-desc">Alphabetical (Z-A)</option>
                </select>
              </div>

            </div>
          </div>
          
          {/* Active filter tags or clear button */}
          {(searchQuery || typeFilter !== 'All') && (
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Found {filteredDocs.length} matching document{filteredDocs.length === 1 ? '' : 's'}
              </span>
              <button
                onClick={handleClearFilters}
                className="text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Document Cards List */}
        {isLoading ? (
          <LoadingState message="Loading documents from Firestore..." />
        ) : filteredDocs.length === 0 ? (
          <EmptyState
            title="No documents found"
            description="Create your first document workspace model or modify your active search filters."
            actionText="Create Document"
            onAction={() => navigate('/create')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredDocs.map((doc) => (
              <Card
                key={doc.id}
                hoverable
                onClick={() => navigate(`/editor?id=${doc.id}`, { state: { id: doc.id, title: doc.title } })}
                bodyClassName="p-5 flex flex-col justify-between h-44"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wide">
                      {doc.doc_type || 'Custom'}
                    </span>
                    <Badge variant="info">Active</Badge>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{doc.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {typeof doc.content === 'string' ? doc.content : 'TipTap rich document model'}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-500">ID: {doc.id.substring(0, 12)}...</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="h-3 w-3" />
                    {formatDate(doc.updated_at)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};
