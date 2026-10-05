import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const colors = [
  { name: 'Black', value: '#0f172a' },
  { name: 'Dark Gray', value: '#475569' },
  { name: 'Gray', value: '#94a3b8' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
];

export const TextColorPicker = ({ editor }) => {
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

  const currentColor = editor.getAttributes('textStyle').color || '';

  const handleSelectColor = (colorVal) => {
    if (!colorVal) {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(colorVal).run();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 p-2 rounded-lg border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer text-sm font-semibold transition-all h-[34px]"
        title="Text Color"
        type="button"
      >
        <span className="flex flex-col items-center justify-center relative">
          <span className="font-serif font-bold text-sm leading-none">A</span>
          <span 
            className="w-4 h-0.5 mt-0.5 rounded-full" 
            style={{ backgroundColor: currentColor || '#0f172a' }}
          />
        </span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-[160px] rounded-xl bg-white border border-slate-200 shadow-premium z-50 p-2.5 animate-fadeIn">
          <div className="grid grid-cols-5 gap-1.5 mb-2">
            {colors.map((c) => (
              <button
                key={c.name}
                onClick={() => handleSelectColor(c.value)}
                className="w-5 h-5 rounded-full border border-slate-200 cursor-pointer transition-transform hover:scale-110 flex items-center justify-center relative"
                style={{ backgroundColor: c.value }}
                title={c.name}
                type="button"
              >
                {currentColor === c.value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white mix-blend-difference" />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleSelectColor('')}
            className="w-full text-left text-[11px] font-semibold text-slate-600 hover:text-slate-900 py-1 px-1.5 rounded-md hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-150"
            type="button"
          >
            Reset to Default
          </button>
        </div>
      )}
    </div>
  );
};
