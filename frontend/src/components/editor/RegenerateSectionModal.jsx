import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X, AlertCircle } from 'lucide-react';
import { aiService } from '../../services/aiService';

export const RegenerateSectionModal = ({ editor, isOpen, onClose, onSuccess }) => {
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [userFeedback, setUserFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract H2 headings from the editor document content
  useEffect(() => {
    if (!editor || !isOpen) return;

    const docHtml = editor.getHTML();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = docHtml;

    const headings = tempDiv.querySelectorAll('h2');
    const parsedSections = [];

    headings.forEach((h2, idx) => {
      const secId = h2.id || `sec-${idx + 1}`;
      const title = h2.textContent || `Section ${idx + 1}`;
      parsedSections.push({
        section_id: secId,
        title: title,
        element: h2,
      });
    });

    setSections(parsedSections);

    if (parsedSections.length > 0) {
      setSelectedSectionId(parsedSections[0].section_id);
    }
  }, [editor, isOpen]);

  if (!isOpen) return null;

  const handleRegenerate = async () => {
    if (!selectedSectionId) {
      setError('Please select a section to regenerate.');
      return;
    }

    if (!userFeedback.trim()) {
      setError('Please enter feedback or revision instructions.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const fullHtml = editor.getHTML();
      const targetSec = sections.find(s => s.section_id === selectedSectionId);
      const title = targetSec ? targetSec.title : 'Section';

      // Extract current HTML of the target section
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fullHtml;

      const targetH2 = tempDiv.querySelector(`#${selectedSectionId}`) ||
        Array.from(tempDiv.querySelectorAll('h2')).find(h => h.textContent.trim() === title.trim());

      let currentSectionHtml = '';
      if (targetH2) {
        let currentNode = targetH2.nextElementSibling;
        const htmlParts = [];
        while (currentNode && currentNode.tagName !== 'H2') {
          htmlParts.push(currentNode.outerHTML);
          currentNode = currentNode.nextElementSibling;
        }
        currentSectionHtml = htmlParts.join('\n');
      }

      const res = await aiService.regenerateSection({
        section_spec: {
          section_id: selectedSectionId,
          title: title,
          description: `Regenerate ${title} based on user feedback`,
          target_word_count: 500,
        },
        current_content: currentSectionHtml || '<p>Original content placeholder</p>',
        user_feedback: userFeedback.trim(),
      });

      const replacementHtml = res?.replacement_html || res?.content_html || '';

      if (!replacementHtml) {
        throw new Error('AI service returned empty replacement content.');
      }

      // Perform clean section swap in TipTap editor HTML
      if (targetH2) {
        // Remove existing sibling nodes under this section heading until next H2
        let nextNode = targetH2.nextElementSibling;
        while (nextNode && nextNode.tagName !== 'H2') {
          const toRemove = nextNode;
          nextNode = nextNode.nextElementSibling;
          toRemove.remove();
        }

        // Insert new replacement HTML after target H2
        targetH2.insertAdjacentHTML('afterend', replacementHtml);
        const updatedFullHtml = tempDiv.innerHTML;
        editor.commands.setContent(updatedFullHtml);
      } else {
        // Fallback: append replacement HTML under heading
        const newPart = `<h2 id="${selectedSectionId}">${title}</h2>\n${replacementHtml}`;
        editor.commands.setContent(`${fullHtml}\n${newPart}`);
      }

      onSuccess?.(title);
      setUserFeedback('');
      onClose();
    } catch (err) {
      console.error('Section regeneration failed:', err);
      const cleanMsg = aiService.sanitizeErrorMessage(err);
      setError(cleanMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden space-y-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Regenerate Section</h3>
              <p className="text-xs text-slate-500">Rewrite a single section using custom feedback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Target Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              {sections.length === 0 ? (
                <option value="">No section headings detected</option>
              ) : (
                sections.map((sec) => (
                  <option key={sec.section_id} value={sec.section_id}>
                    {sec.title}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Revision Instructions */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Revision Feedback & Instructions <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={userFeedback}
              onChange={(e) => setUserFeedback(e.target.value)}
              placeholder="e.g. Expand on the architectural requirements, add standard security controls, and include technical code examples."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isLoading || !userFeedback.trim()}
            className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Rewriting Section...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Regenerate Section
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
