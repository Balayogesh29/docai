import React from 'react';
import { 
  Rows, 
  Trash2, 
  Plus, 
  Minus, 
  Combine, 
  Split, 
  Heading
} from 'lucide-react';

export const TableControls = ({ editor }) => {
  if (!editor || !editor.isActive('table')) return null;

  const btnClass = "p-1.5 rounded text-xs font-medium text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer";

  return (
    <div className="flex items-center gap-1 flex-wrap bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-xs w-full animate-fadeIn mt-2">
      <span className="font-bold text-slate-700 px-1 text-[11px] uppercase tracking-wider flex items-center gap-1">
        <Rows className="h-3.5 w-3.5 text-brand-600" /> Table Options:
      </span>

      <div className="h-4 w-px bg-slate-300 mx-1" />

      {/* Row operations */}
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        className={btnClass}
        title="Add Row Before"
      >
        <Plus className="h-3.5 w-3.5 text-emerald-600" />
        <span>Row Above</span>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className={btnClass}
        title="Add Row After"
      >
        <Plus className="h-3.5 w-3.5 text-emerald-600" />
        <span>Row Below</span>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().deleteRow().run()}
        className={btnClass}
        title="Delete Row"
      >
        <Minus className="h-3.5 w-3.5 text-rose-600" />
        <span>Delete Row</span>
      </button>

      <div className="h-4 w-px bg-slate-300 mx-1" />

      {/* Column operations */}
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        className={btnClass}
        title="Add Column Before"
      >
        <Plus className="h-3.5 w-3.5 text-emerald-600" />
        <span>Col Left</span>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className={btnClass}
        title="Add Column After"
      >
        <Plus className="h-3.5 w-3.5 text-emerald-600" />
        <span>Col Right</span>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className={btnClass}
        title="Delete Column"
      >
        <Minus className="h-3.5 w-3.5 text-rose-600" />
        <span>Delete Col</span>
      </button>

      <div className="h-4 w-px bg-slate-300 mx-1" />

      {/* Cell merge / split */}
      <button
        type="button"
        onClick={() => editor.chain().focus().mergeCells().run()}
        disabled={!editor.can().mergeCells()}
        className={`${btnClass} ${!editor.can().mergeCells() ? 'opacity-40 cursor-not-allowed' : ''}`}
        title="Merge Cells"
      >
        <Combine className="h-3.5 w-3.5 text-brand-600" />
        <span>Merge</span>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().splitCell().run()}
        disabled={!editor.can().splitCell()}
        className={`${btnClass} ${!editor.can().splitCell() ? 'opacity-40 cursor-not-allowed' : ''}`}
        title="Split Cell"
      >
        <Split className="h-3.5 w-3.5 text-brand-600" />
        <span>Split</span>
      </button>

      <div className="h-4 w-px bg-slate-300 mx-1" />

      {/* Header Row toggle */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        className={btnClass}
        title="Toggle Header Row"
      >
        <Heading className="h-3.5 w-3.5 text-slate-700" />
        <span>Header Row</span>
      </button>

      <div className="h-4 w-px bg-slate-300 mx-1" />

      {/* Delete Table */}
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="p-1.5 rounded text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer ml-auto"
        title="Delete Entire Table"
      >
        <Trash2 className="h-3.5 w-3.5 text-rose-600" />
        <span>Delete Table</span>
      </button>
    </div>
  );
};
