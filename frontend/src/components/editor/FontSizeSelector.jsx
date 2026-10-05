import React from 'react';

const sizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '28', '32', '36', '48'];

export const FontSizeSelector = ({ editor }) => {
  if (!editor) return null;

  const currentSize = editor.getAttributes('textStyle').fontSize || '';
  const currentSizeNum = currentSize.replace('px', '');

  const handleValueChange = (e) => {
    const val = e.target.value;
    if (!val) {
      editor.chain().focus().unsetFontSize().run();
    } else {
      editor.chain().focus().setFontSize(`${val}px`).run();
    }
  };

  return (
    <select
      value={currentSizeNum}
      onChange={handleValueChange}
      className="bg-white border border-slate-200 hover:border-slate-350 text-slate-700 text-xs font-semibold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer h-[34px] min-w-[70px]"
      title="Font Size"
      aria-label="Font Size"
    >
      <option value="">Default Size</option>
      {sizes.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
};
