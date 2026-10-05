import { fetchWithAuth } from './api';

export const aiService = {
  /**
   * Initiates and validates a Project Report generation request pipeline.
   */
  initiateProjectReport: async (payload) => {
    return await fetchWithAuth('/api/ai/project-report/initiate', {
      method: 'POST',
      timeoutMs: 60000, // 60s — lightweight validation
      body: JSON.stringify({
        doc_type: 'project_report',
        title: payload.title || '',
        domains: payload.domains || [],
        abstract: payload.abstract || '',
        additional_context: payload.additional_context || '',
        reference_file_ids: payload.reference_file_ids || [],
      }),
    });
  },

  /**
   * Analyzes context (problem statement, proposed solution, objectives, tech stack).
   */
  analyzeProjectContext: async (payload) => {
    return await fetchWithAuth('/api/ai/project-report/analyze-context', {
      method: 'POST',
      timeoutMs: 120000, // 2min — LLM context analysis
      body: JSON.stringify({
        doc_type: 'project_report',
        title: payload.title || '',
        domains: payload.domains || [],
        abstract: payload.abstract || '',
        additional_context: payload.additional_context || '',
        reference_file_ids: payload.reference_file_ids || [],
      }),
    });
  },

  /**
   * Generates dynamic report outline with section descriptions and word counts.
   */
  generateProjectReportOutline: async (contextData, targetWords = 3000, customInstructions = '') => {
    return await fetchWithAuth('/api/ai/project-report/generate-outline', {
      method: 'POST',
      timeoutMs: 120000, // 2min — outline generation
      body: JSON.stringify({
        context: contextData,
        target_total_words: targetWords,
        custom_instructions: customInstructions,
      }),
    });
  },

  /**
   * Sequentially drafts section prose and produces combined HTML.
   * Backend uses checkpoint system with key rotation for resilience.
   */
  generateProjectReportSections: async (projectTitle, contextData, outlineData, tone = 'technical') => {
    return await fetchWithAuth('/api/ai/project-report/generate-sections', {
      method: 'POST',
      timeoutMs: 900000, // 15min — sequential multi-section drafting with checkpoint recovery
      body: JSON.stringify({
        project_title: projectTitle,
        context: contextData,
        outline: outlineData,
        tone: tone,
      }),
    });
  },

  /**
   * Tests connectivity to the AI generation workspace (Gemini API via backend).
   * Calls the diagnostic endpoint to verify API keys and model availability.
   * @returns {Promise<Object>} Connection status with pool info and test response
   */
  testGenerationConnectivity: async () => {
    return await fetchWithAuth('/api/ai/test-gemini', {
      method: 'POST',
      timeoutMs: 30000, // 30s — quick connectivity test
    });
  },

  /**
   * Orchestrates the complete 4-stage Project Report AI generation pipeline
   * with checkpoint-aware progress reporting.
   * 
   * Each stage saves checkpoints on the backend. If a key is exhausted,
   * the backend automatically rotates to the next key in the pool and
   * resumes from the last checkpoint.
   * 
   * Pool separation:
   *   Stage 2 → Analysis Pool (keys 1-2)
   *   Stages 3-4 → Generation Pool (keys 3-6)
   * 
   * @param {Object} formData - Form data from CreateDocumentPage
   * @param {Function} [onProgress] - Callback for updating UI stage progress
   */
  generateFullProjectReport: async (formData, onProgress) => {
    const referenceFileIds = (formData.referenceFiles || [])
      .map(f => f.file_id)
      .filter(Boolean);

    const initPayload = {
      title: formData.title || '',
      domains: formData.selectedDomains || [],
      abstract: formData.abstract || '',
      additional_context: formData.additionalContext || '',
      reference_file_ids: referenceFileIds,
    };

    // Stage 1: Validation & Initiation
    onProgress?.('Stage 1/4: Validating project report request...');
    await aiService.initiateProjectReport(initPayload);
    onProgress?.('✓ Stage 1/4: Validation complete — checkpoint saved');

    // Stage 2: Technical Context Analysis (uses ANALYSIS POOL — keys 1-2)
    onProgress?.('Stage 2/4: Analyzing technical context using analysis key pool...');
    const contextData = await aiService.analyzeProjectContext(initPayload);
    onProgress?.('✓ Stage 2/4: Context analysis complete — checkpoint saved');

    // Stage 3: Dynamic Outline Generation (uses GENERATION POOL — keys 3-6)
    onProgress?.('Stage 3/4: Building dynamic report outline using generation key pool...');
    const outlineData = await aiService.generateProjectReportOutline(
      contextData,
      3000,
      formData.additionalInstructions || ''
    );
    onProgress?.(`✓ Stage 3/4: Outline generated — ${outlineData?.sections?.length || 0} sections`);

    // Stage 4: Section-by-Section Drafting (uses GENERATION POOL with checkpoint recovery)
    const sectionCount = outlineData?.sections?.length || 0;
    onProgress?.(`Stage 4/4: Drafting ${sectionCount} sections using generation key pool with checkpoint recovery...`);
    const sectionsResponse = await aiService.generateProjectReportSections(
      formData.title,
      contextData,
      outlineData,
      formData.writingStyle?.toLowerCase() || 'technical'
    );
    onProgress?.(`✓ Stage 4/4: All ${sectionCount} sections drafted — ${sectionsResponse?.total_word_count || 0} words total`);

    return sectionsResponse;
  },

  /**
   * Sanitizes raw error objects or message strings into clean, user-friendly messages.
   */
  sanitizeErrorMessage: (err) => {
    if (!err) return 'Report generation failed. Please try again.';
    const msg = err.message || (typeof err === 'string' ? err : '');
    if (msg.includes('502') || msg.includes('Bad Gateway') || msg.includes('500')) {
      return 'The AI service encountered a temporary error. Please try again in a moment.';
    }
    if (msg.includes('timed out') || msg.includes('504')) {
      return 'The report generation timed out. Please try again with shorter context or fewer sections.';
    }
    if (msg.includes('Network') || msg.includes('fetch')) {
      return 'Network connection error. Please check your internet connection and backend status.';
    }
    if (msg.includes('authenticated') || msg.includes('401')) {
      return 'Authentication token expired. Please sign in again.';
    }
    if (msg.includes('key') && msg.includes('exhausted')) {
      return 'All API keys have been exhausted. Please wait for rate limits to reset or add more keys.';
    }
    return msg || 'Report generation failed. Please try again.';
  },
};
