import React, { useState, useRef, useEffect } from 'react';
import { Highlighter, ChevronDown } from 'lucide-react';

const highlightColors = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Purple', value: '#e9d5ff' },
];

export const HighlightPicker = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) return null;

  const currentHighlight = editor.getAttributes('highlight').color || '';

  const handleSelectHighlight = (colorVal) => {
    if (!colorVal) {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color: colorVal }).run();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 p-2 rounded-lg border text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer text-sm font-semibold transition-all h-[34px]
          ${currentHighlight ? 'bg-slate-100/80 border-slate-200' : 'border-transparent'}
        `}
        title="Highlight Color"
        type="button"
      >
        <span className="flex flex-col items-center justify-center relative">
          <Highlighter className="h-4 w-4" style={{ color: currentHighlight || 'currentColor' }} />
        </span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-[140px] rounded-xl bg-white border border-slate-200 shadow-premium z-50 p-2.5 animate-fadeIn">
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {highlightColors.map((h) => (
              <button
                key={h.name}
                onClick={() => handleSelectHighlight(h.value)}
                className="w-7 h-7 rounded border border-slate-250 cursor-pointer transition-transform hover:scale-105 flex items-center justify-center relative"
                style={{ backgroundColor: h.value }}
                title={h.name}
                type="button"
              >
                {currentHighlight === h.value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleSelectHighlight('')}
            className="w-full text-left text-[11px] font-semibold text-slate-600 hover:text-slate-900 py-1 px-1.5 rounded-md hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-150"
            type="button"
          >
            No Highlight
          </button>
        </div>
      )}
    </div>
  );
};
