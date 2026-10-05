import React from 'react';

const fonts = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Cambria', value: 'Cambria, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Palatino', value: '"Palatino Linotype", Palatino, Georgia, serif' },
  { label: 'Book Antiqua', value: '"Book Antiqua", Palatino, serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Inter', value: 'Inter, sans-serif' }
];

export const FontFamilySelector = ({ editor }) => {
  if (!editor) return null;

  const currentFontValue = editor.getAttributes('textStyle').fontFamily || '';

  const handleValueChange = (e) => {
    const val = e.target.value;
    if (!val) {
      editor.chain().focus().unsetFontFamily().run();
    } else {
      editor.chain().focus().setFontFamily(val).run();
    }
  };

  return (
    <select
      value={currentFontValue}
      onChange={handleValueChange}
      className="bg-white border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-semibold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer h-[34px] min-w-[130px]"
      title="Font Family"
      aria-label="Font Family"
    >
      <option value="">Default Font</option>
      {fonts.map((f) => (
        <option key={f.label} value={f.value}>
          {f.label}
        </option>
      ))}
    </select>
  );
};
