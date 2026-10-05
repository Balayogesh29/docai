import React, { useState, useRef, useEffect } from 'react';
import { Link as LinkIcon, Unlink, ExternalLink } from 'lucide-react';

export const LinkEditorPopover = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!editor) return null;

  const isLinkActive = editor.isActive('link');

  const openPopover = () => {
    const existingHref = editor.getAttributes('link').href || '';
    setUrl(existingHref);
    setError('');
    setIsOpen(true);
  };

  const handleApply = (e) => {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setError('URL cannot be empty');
      return;
    }

    // Process & validate URL
    let formattedUrl = trimmed;
    if (!/^https?:\/\//i.test(formattedUrl) && !/^mailto:/i.test(formattedUrl) && !/^tel:/i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      new URL(formattedUrl); // Basic URL format check
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    // Apply link mark without altering existing text or formatting
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: formattedUrl })
      .run();

    setIsOpen(false);
    setError('');
  };

  const handleRemove = () => {
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .unsetLink()
      .run();

    setIsOpen(false);
    setError('');
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={openPopover}
        className={`p-2 rounded-lg border text-sm transition-all duration-150 flex items-center gap-1 cursor-pointer ${
          isLinkActive || isOpen
            ? 'bg-brand-50 border-brand-200 text-brand-600 font-bold shadow-sm'
            : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
        title="Insert or Edit Link (Ctrl+K)"
        aria-label="Link"
      >
        <LinkIcon className="h-4.5 w-4.5" />
        <span className="text-xs font-semibold hidden md:inline">Link</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 mt-1 w-72 rounded-xl bg-white p-4 shadow-xl border border-slate-200 z-50 animate-fadeIn">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>{isLinkActive ? 'Edit Link' : 'Insert Link'}</span>
            {url && (
              <a
                href={url.startsWith('http') ? url : `https://${url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-brand-600 transition-colors"
                title="Open Link"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </h4>

          <form onSubmit={handleApply} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                URL Address:
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError('');
                }}
                placeholder="https://example.com"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium text-slate-800"
                autoFocus
              />
              {error && (
                <p className="text-[11px] font-semibold text-rose-500 mt-1">
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              {isLinkActive ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shadow-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
