import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, ListTree, X } from 'lucide-react';

export const DocumentOutline = ({ editor, onClose, isMobileDrawer = false }) => {
  const [headings, setHeadings] = useState([]);
  const [activePos, setActivePos] = useState(null);
  const [collapsedPositions, setCollapsedPositions] = useState(new Set());

  // Extract headings and detect active section from TipTap editor
  const updateOutline = useCallback(() => {
    if (!editor || editor.isDestroyed) return;

    const doc = editor.state.doc;
    const extractedHeadings = [];
    
    // Traverse ProseMirror document tree
    doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && [1, 2, 3].includes(node.attrs.level)) {
        extractedHeadings.push({
          pos,
          level: node.attrs.level,
          text: node.textContent.trim() || `Heading ${node.attrs.level}`,
          nodeSize: node.nodeSize,
        });
      }
    });

    setHeadings(extractedHeadings);

    // Active Section Detection
    const selectionFrom = editor.state.selection.from;
    let currentActive = null;
    for (let i = 0; i < extractedHeadings.length; i++) {
      if (extractedHeadings[i].pos <= selectionFrom) {
        currentActive = extractedHeadings[i].pos;
      } else {
        break;
      }
    }
    setActivePos(currentActive);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    updateOutline();

    editor.on('update', updateOutline);
    editor.on('selectionUpdate', updateOutline);

    return () => {
      editor.off('update', updateOutline);
      editor.off('selectionUpdate', updateOutline);
    };
  }, [editor, updateOutline]);

  // Toggle collapse state for a heading item
  const toggleCollapse = (pos, e) => {
    e.stopPropagation();
    setCollapsedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) {
        next.delete(pos);
      } else {
        next.add(pos);
      }
      return next;
    });
  };

  // Section navigation
  const handleHeadingClick = (heading) => {
    if (!editor || editor.isDestroyed) return;

    const doc = editor.state.doc;
    if (heading.pos >= doc.content.size) return;

    const targetNode = doc.nodeAt(heading.pos);

    // Check node position and set cursor inside text block if valid
    let cursorTarget = heading.pos;
    if (targetNode && targetNode.type.name === 'heading') {
      cursorTarget = Math.min(heading.pos + 1, doc.content.size);
    }

    editor
      .chain()
      .focus()
      .setTextSelection(cursorTarget)
      .scrollIntoView()
      .run();

    if (isMobileDrawer && onClose) {
      onClose();
    }
  };

  // Check if a heading is child expandable
  const isExpandable = (index) => {
    if (index >= headings.length - 1) return false;
    return headings[index + 1].level > headings[index].level;
  };

  // Hierarchy-aware visibility calculation
  const isHeadingVisible = (index) => {
    const current = headings[index];
    
    for (let j = 0; j < index; j++) {
      const ancestor = headings[j];
      if (collapsedPositions.has(ancestor.pos) && ancestor.level < current.level) {
        // Check if there is an intermediate heading that broke ancestor's scope
        let broken = false;
        for (let k = j + 1; k < index; k++) {
          if (headings[k].level <= ancestor.level) {
            broken = true;
            break;
          }
        }
        if (!broken) {
          return false;
        }
      }
    }
    return true;
  };

  const visibleHeadings = headings.filter((_, idx) => isHeadingVisible(idx));

  const content = (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
          <ListTree className="h-4 w-4 text-brand-600" />
          <span>Document Outline</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close outline"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Headings List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {headings.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-slate-400 font-medium">No headings found in document.</p>
            <p className="text-[11px] text-slate-400 mt-1">Add H1, H2, or H3 to generate an outline.</p>
          </div>
        ) : (
          visibleHeadings.map((heading) => {
            const originalIndex = headings.findIndex((h) => h.pos === heading.pos);
            const expandable = isExpandable(originalIndex);
            const isCollapsed = collapsedPositions.has(heading.pos);
            const isActive = activePos === heading.pos;

            // Indentation per level
            const indentClass =
              heading.level === 1
                ? 'pl-2'
                : heading.level === 2
                ? 'pl-6'
                : 'pl-10';

            const badgeColor =
              heading.level === 1
                ? 'bg-brand-100 text-brand-700'
                : heading.level === 2
                ? 'bg-sky-100 text-sky-700'
                : 'bg-slate-200 text-slate-700';

            return (
              <div
                key={`${heading.pos}-${originalIndex}`}
                onClick={() => handleHeadingClick(heading)}
                className={`
                  group flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs cursor-pointer transition-all duration-150
                  ${indentClass}
                  ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold border-l-2 border-brand-600'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-normal'
                  }
                `}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  {/* Collapse / Expand icon */}
                  {expandable ? (
                    <button
                      type="button"
                      onClick={(e) => toggleCollapse(heading.pos, e)}
                      className="p-0.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 flex-shrink-0"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : (
                    <span className="w-3.5 flex-shrink-0" />
                  )}

                  <span className="truncate">{heading.text}</span>
                </div>

                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badgeColor} flex-shrink-0 ml-1.5`}>
                  H{heading.level}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (isMobileDrawer) {
    return (
      <div className="fixed inset-0 z-40 flex">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
        {/* Drawer content */}
        <div className="relative z-50 w-72 max-w-[80vw] h-full shadow-xl bg-white animate-slideRight">
          {content}
        </div>
      </div>
    );
  }

  return <div className="w-64 h-full flex-shrink-0">{content}</div>;
};
