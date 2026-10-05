import React, { useState, useRef, useEffect } from 'react';
import { Table, ChevronDown } from 'lucide-react';

export const TableInsertPopover = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
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

  const handleInsert = (e) => {
    e.preventDefault();
    const parsedRows = Math.min(Math.max(1, parseInt(rows, 10) || 3), 20);
    const parsedCols = Math.min(Math.max(1, parseInt(cols, 10) || 3), 10);

    editor
      .chain()
      .focus()
      .insertTable({ rows: parsedRows, cols: parsedCols, withHeaderRow: true })
      .run();

    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg border text-sm transition-all duration-150 flex items-center gap-1 cursor-pointer ${
          isOpen || editor.isActive('table')
            ? 'bg-brand-50 border-brand-200 text-brand-600 font-bold shadow-sm'
            : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
        title="Insert Table"
        aria-label="Insert Table"
      >
        <Table className="h-4.5 w-4.5" />
        <span className="text-xs font-semibold hidden md:inline">Table</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 mt-1 w-60 rounded-xl bg-white p-4 shadow-xl border border-slate-200 z-50 animate-fadeIn">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Insert Table
          </h4>
          <form onSubmit={handleInsert} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-slate-600">Rows (1-20):</label>
              <input
                type="number"
                min="1"
                max="20"
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                className="w-20 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold text-slate-800"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-slate-600">Columns (1-10):</label>
              <input
                type="number"
                min="1"
                max="10"
                value={cols}
                onChange={(e) => setCols(e.target.value)}
                className="w-20 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold text-slate-800"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
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
                Insert
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
