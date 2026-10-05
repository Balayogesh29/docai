import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { FontSize } from '../components/editor/extensions/FontSize';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { DocumentEditor } from '../components/editor/DocumentEditor';
import { DocumentOutline } from '../components/editor/DocumentOutline';
import { DocumentStats } from '../components/editor/DocumentStats';
import { ArrowLeft, Save, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../components/common/Button';
import { documentService } from '../services/documentService';

export const EditorPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract document ID from location state or URL search parameters
  const searchParams = new URLSearchParams(location.search);
  const initialDocId = location.state?.id || searchParams.get('id');

  const [currentDocId, setCurrentDocId] = useState(initialDocId || null);

  // Read title passed from state or query params, default to 'Untitled Document'
  const [title, setTitle] = useState(
    location.state?.title || 'Untitled Document'
  );

  // Outline sidebar toggle state
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);

  // Frontend save status state: 'saved' | 'unsaved' | 'saving'
  const [saveStatus, setSaveStatus] = useState('saved');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        underline: false,
      }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'tableCell', 'tableHeader'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'text-brand-600 underline hover:text-brand-700 font-medium cursor-pointer',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your document here...',
        emptyNodeClass: 'is-editor-empty',
      }),
    ],
    content: '',
  });

  // Track document changes to update save status
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      setSaveStatus('unsaved');
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  // Load document content from Firestore backend or initial location state if present
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    if (currentDocId) {
      const loadDocument = async () => {
        try {
          const doc = await documentService.getDocumentById(currentDocId);
          if (doc.title) setTitle(doc.title);
          if (doc.content_html) {
            editor.commands.setContent(doc.content_html);
          } else if (doc.content) {
            editor.commands.setContent(doc.content);
          }
          setSaveStatus('saved');
        } catch (err) {
          console.error('Failed to load document from Firestore:', err);
        }
      };
      loadDocument();
    } else if (location.state?.contentHtml && editor.isEmpty) {
      editor.commands.setContent(location.state.contentHtml);
      setSaveStatus('unsaved');
    } else {
      // Fallback to local draft cache if present
      try {
        const saved = localStorage.getItem('docai_current_draft');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!location.state?.title && parsed.title) {
            setTitle(parsed.title);
          }
          if (parsed.json && editor.isEmpty) {
            editor.commands.setContent(parsed.json);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [editor, currentDocId, location.state]);


  const handleSave = async () => {
    if (!editor || saveStatus === 'saving') return;

    setSaveStatus('saving');

    const contentJson = editor.getJSON();

    try {
      if (currentDocId) {
        await documentService.updateDocument(currentDocId, {
          title,
          content: contentJson,
        });
      } else {
        const newDoc = await documentService.createDocument({
          title: title || 'Untitled Document',
          doc_type: 'custom',
          content: contentJson,
        });
        setCurrentDocId(newDoc.id);
        navigate(`/editor?id=${newDoc.id}`, {
          replace: true,
          state: { id: newDoc.id, title: newDoc.title },
        });
      }

      // Also update local storage cache for offline safety
      try {
        localStorage.setItem(
          'docai_current_draft',
          JSON.stringify({ title, json: contentJson, updatedAt: new Date().toISOString() })
        );
      } catch {}

      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save document to backend:', err);
      setSaveStatus('unsaved');
    }
  };

  const renderSaveBadge = () => {
    if (saveStatus === 'saving') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100 animate-fadeIn">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
          Saving...
        </span>
      );
    }

    if (saveStatus === 'unsaved') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 animate-fadeIn">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Unsaved changes
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 animate-fadeIn">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        Saved
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-4 py-2">
        {/* Top Breadcrumb Nav */}
        <div className="flex items-center space-x-3 text-xs text-slate-500 font-medium">
          <span 
            className="cursor-pointer hover:text-brand-600" 
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 font-semibold">Workspace Editor</span>
        </div>

        {/* Sticky Editor Header & Toolbar Box */}
        <div className="sticky top-0 bg-slate-50 z-20 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 px-6 py-4 sm:px-8 border-b border-slate-200 space-y-3.5 shadow-sm">
          {/* Title & Save Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-colors flex-shrink-0"
                title="Back to Dashboard"
                type="button"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSaveStatus('unsaved');
                }}
                className="text-base sm:text-lg font-bold text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-brand-500 focus:bg-white rounded px-2.5 py-1 outline-none transition-all flex-1 min-w-0"
                placeholder="Untitled Document"
              />
            </div>
            
            <div className="flex items-center gap-3.5 flex-shrink-0">
              <div className="hidden sm:block">
                {renderSaveBadge()}
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                icon={Save}
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Toolbar section */}
          <div className="border-t border-slate-200 pt-2 flex items-center">
            <EditorToolbar
              editor={editor}
              isOutlineOpen={isOutlineOpen}
              onToggleOutline={() => setIsOutlineOpen((prev) => !prev)}
              onSectionRegenerated={() => setSaveStatus('unsaved')}
            />

          </div>
        </div>

        {/* Save status badge for small screens */}
        <div className="sm:hidden mb-2 flex justify-end">
          {renderSaveBadge()}
        </div>

        {/* Workspace Layout: Outline + Editor + Statistics */}
        <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[700px]">
          {/* Desktop Sidebar Outline */}
          {isOutlineOpen && (
            <div className="hidden md:block flex-shrink-0">
              <DocumentOutline
                editor={editor}
                onClose={() => setIsOutlineOpen(false)}
              />
            </div>
          )}

          {/* Mobile Drawer Outline */}
          {isOutlineOpen && (
            <div className="md:hidden">
              <DocumentOutline
                editor={editor}
                onClose={() => setIsOutlineOpen(false)}
                isMobileDrawer={true}
              />
            </div>
          )}

          {/* Main Editor & Statistics Workspace */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
            <div className="flex-1 overflow-x-auto">
              <DocumentEditor editor={editor} />
            </div>
            <DocumentStats editor={editor} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
