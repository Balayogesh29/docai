import React, { useRef, useState } from 'react';
import { Image as ImageIcon, AlertCircle, X } from 'lucide-react';

export const ImageUploader = ({ editor }) => {
  const fileInputRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!editor) return null;

  const handleButtonClick = () => {
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Reset input so same file can be selected again if needed
    e.target.value = '';

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    // Validate file size (5 MB limit)
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      setErrorMessage('Image size must be less than 5 MB.');
      return;
    }

    // Convert file to local Object URL / Data URL representation
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target.result;
      if (src) {
        editor.chain().focus().setImage({ src }).run();
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleButtonClick}
        className="p-2 rounded-lg border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-sm transition-all duration-150 flex items-center gap-1 cursor-pointer"
        title="Insert Image (PNG, JPG, WEBP <= 5MB)"
        aria-label="Insert Image"
      >
        <ImageIcon className="h-4.5 w-4.5" />
        <span className="text-xs font-semibold hidden md:inline">Image</span>
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
      />

      {/* Error Toast / Alert Modal if validation fails */}
      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-fadeIn max-w-sm">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <p className="text-xs font-semibold flex-1">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-rose-400 hover:text-rose-700 p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
};
