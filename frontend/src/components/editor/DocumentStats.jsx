import React, { useState, useEffect, useCallback } from 'react';
import { Type, Hash, Clock } from 'lucide-react';

export const DocumentStats = ({ editor }) => {
  const [stats, setStats] = useState({
    words: 0,
    characters: 0,
    readingTime: '0 min',
  });

  const calculateStats = useCallback(() => {
    if (!editor || editor.isDestroyed) return;

    const rawText = editor.getText() || '';
    const words = rawText.trim() ? rawText.trim().split(/\s+/).filter(Boolean).length : 0;
    const characters = rawText.length;

    let readingTime = '0 min';
    if (words === 0) {
      readingTime = '0 min';
    } else if (words < 200) {
      readingTime = '< 1 min';
    } else {
      readingTime = `${Math.ceil(words / 200)} min`;
    }

    setStats({ words, characters, readingTime });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    calculateStats();

    editor.on('update', calculateStats);
    editor.on('selectionUpdate', calculateStats);

    return () => {
      editor.off('update', calculateStats);
      editor.off('selectionUpdate', calculateStats);
    };
  }, [editor, calculateStats]);

  return (
    <div className="w-full bg-slate-100/80 backdrop-blur-xs border-t border-slate-200 py-2 px-4 flex flex-wrap items-center justify-between text-xs text-slate-600 font-medium rounded-b-xl shadow-xs">
      <div className="flex items-center space-x-4 sm:space-x-6 flex-wrap gap-y-1">
        <div className="flex items-center space-x-1.5" title="Word count">
          <Type className="h-3.5 w-3.5 text-slate-400" />
          <span>
            Words: <strong className="text-slate-800 font-semibold">{stats.words.toLocaleString()}</strong>
          </span>
        </div>

        <div className="h-3 w-px bg-slate-300 hidden sm:block" />

        <div className="flex items-center space-x-1.5" title="Character count">
          <Hash className="h-3.5 w-3.5 text-slate-400" />
          <span>
            Characters: <strong className="text-slate-800 font-semibold">{stats.characters.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 mt-1 sm:mt-0" title="Estimated reading time">
        <Clock className="h-3.5 w-3.5 text-brand-500" />
        <span>
          Reading time: <strong className="text-brand-700 font-semibold">{stats.readingTime}</strong>
        </span>
      </div>
    </div>
  );
};
