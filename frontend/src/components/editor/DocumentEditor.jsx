import React from 'react';
import { EditorContent } from '@tiptap/react';

export const DocumentEditor = ({ editor }) => {
  if (!editor) return null;

  return (
    <div 
      className="w-full bg-slate-50 py-6 sm:py-10 min-h-[600px] flex justify-center cursor-text"
      onClick={() => editor.commands.focus()}
    >
      {/* Centered Document Page */}
      <div 
        className="w-full max-w-[800px] bg-white shadow-premium hover:shadow-premium-hover border border-slate-200 rounded-xl p-8 sm:p-12 md:p-16 min-h-[800px] transition-all duration-300 overflow-x-auto"
        onClick={(e) => e.stopPropagation()} // Prevent double trigger focus when clicking directly on page
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
