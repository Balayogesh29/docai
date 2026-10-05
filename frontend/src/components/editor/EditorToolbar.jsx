import React, { useState } from 'react';
import { 
  Undo2, 
  Redo2, 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ListTree,
  Sparkles
} from 'lucide-react';
import { FontFamilySelector } from './FontFamilySelector';
import { FontSizeSelector } from './FontSizeSelector';
import { TextColorPicker } from './TextColorPicker';
import { HighlightPicker } from './HighlightPicker';
import { TableInsertPopover } from './TableInsertPopover';
import { TableControls } from './TableControls';
import { LinkEditorPopover } from './LinkEditorPopover';
import { ImageUploader } from './ImageUploader';
import { RegenerateSectionModal } from './RegenerateSectionModal';

export const EditorToolbar = ({ editor, isOutlineOpen, onToggleOutline, onSectionRegenerated }) => {
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);

  if (!editor) return null;

  const handleHeadingChange = (e) => {
    const value = e.target.value;
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else if (value === 'h1') {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (value === 'h2') {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (value === 'h3') {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    }
  };

  const getHeadingValue = () => {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    return 'paragraph';
  };

  const isUndoDisabled = !editor.can().chain().focus().undo().run();
  const isRedoDisabled = !editor.can().chain().focus().redo().run();

  const buttonClass = (isActive, disabled = false) => `
    p-2 rounded-lg border text-sm transition-all duration-150 flex items-center justify-center
    ${isActive 
      ? 'bg-brand-50 border-brand-200 text-brand-600 font-bold shadow-sm' 
      : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }
    ${disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}
  `;

  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1.5 px-1 no-scrollbar flex-nowrap w-full">
        {/* Outline toggle button */}
        {onToggleOutline && (
          <>
            <button
              onClick={onToggleOutline}
              className={buttonClass(isOutlineOpen)}
              title={isOutlineOpen ? 'Hide Outline' : 'Show Outline'}
              aria-label="Toggle Document Outline"
              type="button"
            >
              <ListTree className="h-4.5 w-4.5 text-brand-600" />
              <span className="hidden md:inline ml-1.5 text-xs font-semibold text-slate-700">Outline</span>
            </button>
            <div className="h-6 w-px bg-slate-200 flex-shrink-0 mx-1" />
          </>
        )}

        {/* Regenerate Section AI button */}
        <button
          onClick={() => setIsRegenerateModalOpen(true)}
          className="p-2 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 text-xs font-bold transition-all duration-150 flex items-center gap-1.5 flex-shrink-0 shadow-sm"
          title="Rewrite or refine a single section using custom feedback"
          type="button"
        >
          <Sparkles className="h-4 w-4 text-brand-600" />
          <span>Regenerate Section</span>
        </button>

        <div className="h-6 w-px bg-slate-200 flex-shrink-0 mx-1" />

        {/* Undo / Redo group */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={isUndoDisabled}
            className={buttonClass(false, isUndoDisabled)}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            type="button"
          >
            <Undo2 className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={isRedoDisabled}
            className={buttonClass(false, isRedoDisabled)}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
            type="button"
          >
            <Redo2 className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200 flex-shrink-0 mx-1" />

        {/* Font Family & Font Size */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <FontFamilySelector editor={editor} />
          <FontSizeSelector editor={editor} />
        </div>

        <div className="h-6 w-px bg-slate-200 flex-shrink-0 mx-1" />

        {/* Bold / Italic / Underline / Color / Highlight group */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={buttonClass(editor.isActive('bold'))}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
            type="button"
          >
            <Bold className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={buttonClass(editor.isActive('italic'))}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
            type="button"
          >
            <Italic className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={buttonClass(editor.isActive('underline'))}
            title="Underline (Ctrl+U)"
            aria-label="Underline"
            type="button"
          >
            <UnderlineIcon className="h-4.5 w-4.5" />
          </button>
          <TextColorPicker editor={editor} />
          <HighlightPicker editor={editor} />
        </div>

        <div className="h-6 w-px bg-slate-200 flex-shrink-0 mx-1" />

        {/* Headings dropdown */}
        <div className="flex-shrink-0">
          <select
            value={getHeadingValue()}
            onChange={handleHeadingChange}
            className="bg-white border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer h-[34px] min-w-[120px]"
            title="Text Style"
            aria-label="Text Style"
          >
            <option value="paragraph">Normal Text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
        </div>

        <div className="h-6 w-px bg-slate-200 flex-shrink-0 mx-1" />

        {/* Alignment controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={buttonClass(editor.isActive({ textAlign: 'left' }))}
            title="Align Left"
            aria-label="Align Left"
            type="button"
          >
            <AlignLeft className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={buttonClass(editor.isActive({ textAlign: 'center' }))}
            title="Align Center"
            aria-label="Align Center"
            type="button"
          >
            <AlignCenter className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={buttonClass(editor.isActive({ textAlign: 'right' }))}
            title="Align Right"
            aria-label="Align Right"
            type="button"
          >
            <AlignRight className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={buttonClass(editor.isActive({ textAlign: 'justify' }))}
            title="Justify"
            aria-label="Justify"
            type="button"
          >
            <AlignJustify className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200 flex-shrink-0 mx-1" />

        {/* Bullet list / Ordered list group */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={buttonClass(editor.isActive('bulletList'))}
            title="Bullet List"
            aria-label="Bullet List"
            type="button"
          >
            <List className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={buttonClass(editor.isActive('orderedList'))}
            title="Numbered List"
            aria-label="Numbered List"
            type="button"
          >
            <ListOrdered className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200 flex-shrink-0 mx-1" />

        {/* Phase 3C Insertions: Link | Image | Table */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <LinkEditorPopover editor={editor} />
          <ImageUploader editor={editor} />
          <TableInsertPopover editor={editor} />
        </div>
      </div>

      {/* Contextual Table Controls (Visible when cursor inside a table) */}
      <TableControls editor={editor} />

      {/* Regenerate Section Modal */}
      <RegenerateSectionModal
        editor={editor}
        isOpen={isRegenerateModalOpen}
        onClose={() => setIsRegenerateModalOpen(false)}
        onSuccess={(secTitle) => {
          onSectionRegenerated?.(secTitle);
        }}
      />
    </div>
  );
};

