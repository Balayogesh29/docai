import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileSpreadsheet,
  Cpu,
  BarChart3,
  Building,
  FileSignature,
  Code,
  Shield,
  FileText,
  Plus,
  Trash2,
  Upload,
  Check,
  CheckCircle,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  File,
  AlertTriangle
} from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import {
  DOCUMENT_TYPES,
  DOMAINS,
  LANGUAGES,
  WRITING_STYLES,
  DETAIL_LEVELS
} from '../data/documentOptions';
import { documentService } from '../services/documentService';
import { storageService } from '../services/storageService';
import { aiService } from '../services/aiService';


export const CreateDocumentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Wizard Steps Configuration
  const steps = [
    { number: 1, name: 'Document Type', label: 'Document' },
    { number: 2, name: 'Document Information', label: 'Information' },
    { number: 3, name: 'Reference Material', label: 'References' },
    { number: 4, name: 'Document Preferences', label: 'Preferences' },
    { number: 5, name: 'Review & Confirm', label: 'Review' }
  ];

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');

  // Parent state containing the entire workflow data
  const [formData, setFormData] = useState({
    documentType: '',
    customDocumentName: '',
    selectedDomains: [],
    customDomain: '',
    title: '',
    abstract: '',
    objectives: [''],
    additionalContext: '',
    referenceFiles: [],
    language: 'English',
    writingStyle: 'Professional',
    detailLevel: 'Standard',
    targetAudience: '',
    additionalInstructions: '',
    includeTableOfContents: false,
    includeReferences: false,
    includeExecutiveSummary: false
  });

  // Load type from URL query params (e.g. from Dashboard Quick Create)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const typeParam = searchParams.get('type');
    if (typeParam && DOCUMENT_TYPES.includes(typeParam)) {
      setFormData(prev => ({
        ...prev,
        documentType: typeParam
      }));
    }
  }, [location.search]);

  // Dynamically map document type to Lucide icons
  const getTypeIcon = (type) => {
    switch (type) {
      case 'Research Paper': return BookOpen;
      case 'Project Report': return FileSpreadsheet;
      case 'Technical Documentation': return Cpu;
      case 'Business Report': return BarChart3;
      case 'Company Profile': return Building;
      case 'Proposal': return FileSignature;
      case 'Software Specification': return Code;
      case 'Policy Document': return Shield;
      default: return FileText;
    }
  };

  // Format bytes to human readable sizes
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type color/badge representation
  const getFileBadgeColor = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'danger';
    if (ext === 'docx') return 'info';
    return 'default';
  };

  // Clear errors when updating values
  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Step 1 Handlers
  const handleTypeSelect = (type) => {
    setFormData(prev => ({ ...prev, documentType: type }));
    clearFieldError('documentType');
  };

  const handleDomainSelect = (domain) => {
    setFormData(prev => {
      const current = prev.selectedDomains || [];
      const isSelected = current.includes(domain);
      const updated = isSelected
        ? current.filter(d => d !== domain)
        : [...current, domain];
      return { ...prev, selectedDomains: updated };
    });
    clearFieldError('selectedDomains');
    clearFieldError('domain');
  };

  // Step 2 Objectives handlers
  const handleObjectiveChange = (index, value) => {
    const nextObjectives = [...formData.objectives];
    nextObjectives[index] = value;
    setFormData(prev => ({ ...prev, objectives: nextObjectives }));
    clearFieldError('objectives');
  };

  const addObjective = () => {
    setFormData(prev => ({ ...prev, objectives: [...prev.objectives, ''] }));
  };

  const removeObjective = (index) => {
    if (formData.objectives.length <= 1) return;
    const nextObjectives = formData.objectives.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, objectives: nextObjectives }));
  };

  // Step 3 Drag-and-Drop / File selection with Firebase Storage upload
  const processFiles = async (filesList) => {
    setFileError('');
    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
    const allowedExtensions = ['pdf', 'docx', 'txt', 'doc'];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const ext = file.name.split('.').pop().toLowerCase();

      if (!allowedExtensions.includes(ext)) {
        setFileError(`"${file.name}" rejected: Only PDF, DOCX, TXT, and DOC files are allowed.`);
        return;
      }

      if (file.size > maxSizeBytes) {
        setFileError(`"${file.name}" rejected: File size exceeds the 10 MB limit.`);
        return;
      }

      try {
        const uploaded = await storageService.uploadFile(file);
        setFormData(prev => ({
          ...prev,
          referenceFiles: [...prev.referenceFiles, {
            name: file.name,
            size: file.size,
            file_id: uploaded.file_id,
            download_url: uploaded.download_url,
            storage_path: uploaded.storage_path
          }]
        }));
      } catch (err) {
        setFileError(`Failed to upload "${file.name}": ${err.message}`);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileBrowse = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeFile = async (indexToRemove) => {
    const fileToRemove = formData.referenceFiles[indexToRemove];
    if (fileToRemove?.file_id) {
      try {
        await storageService.deleteFile(fileToRemove.file_id);
      } catch (err) {
        console.error("Failed to delete storage file:", err);
      }
    }
    setFormData(prev => ({
      ...prev,
      referenceFiles: prev.referenceFiles.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Validation
  const validateStep = (step) => {
    const currentErrors = {};

    if (step === 1) {
      if (!formData.documentType) {
        currentErrors.documentType = 'Please select a document type.';
      } else if (formData.documentType === 'Custom Document' && !formData.customDocumentName.trim()) {
        currentErrors.customDocumentName = 'Please enter a custom document name.';
      }

      if (!formData.selectedDomains || formData.selectedDomains.length === 0) {
        currentErrors.selectedDomains = 'Please select at least one domain.';
      } else if (formData.selectedDomains.includes('Other') && !formData.customDomain.trim()) {
        currentErrors.customDomain = 'Please specify your domain.';
      }
    }

    if (step === 2) {
      if (!formData.title.trim()) {
        currentErrors.title = 'Document title is required.';
      }
    }

    setErrors(currentErrors);
    return Object.keys(currentErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleEditStep = (stepNumber) => {
    setCurrentStep(stepNumber);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setProgressMessage('');
    setFileError('');
    try {
      const normalizedType = formData.documentType?.toLowerCase().replace(/\s+/g, '_');
      let initialContent = null;

      if (normalizedType === 'project_report') {
        const reportResult = await aiService.generateFullProjectReport(formData, (stageMsg) => {
          setProgressMessage(stageMsg);
        });
        initialContent = reportResult?.combined_html || null;
      }

      const newDoc = await documentService.createDocument({
        title: formData.title || 'Untitled Document',
        doc_type: formData.documentType || 'custom',
        content: initialContent || {
          abstract: formData.abstract,
          objectives: formData.objectives,
          domains: formData.selectedDomains,
          language: formData.language,
          writingStyle: formData.writingStyle,
          detailLevel: formData.detailLevel,
          referenceFiles: formData.referenceFiles
        }
      });
      navigate(`/editor?id=${newDoc.id}`, { state: { id: newDoc.id, title: newDoc.title } });
    } catch (err) {
      console.error("Failed to generate project report or persist document to backend:", err);
      setIsSubmitting(false);
      setProgressMessage('');
      const cleanErrorMsg = aiService.sanitizeErrorMessage(err);
      setFileError(cleanErrorMsg);
    }
  };


  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Breadcrumb Nav */}
        <div className="flex items-center space-x-3 text-xs text-slate-500 font-medium">
          <span className="cursor-pointer hover:text-brand-655 text-brand-600" onClick={() => navigate('/dashboard')}>
            Dashboard
          </span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-slate-900 font-semibold">Create Document</span>
        </div>

        {/* Premium Wizard Header & Stepper */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-premium space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Configure Document Framework</h2>
              <p className="text-xs text-slate-500 mt-0.5">Step {currentStep} of 5 — {steps[currentStep - 1].name}</p>
            </div>
            {/* Visual Indicator of Completed Percentage */}
            <div className="w-full sm:w-44 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
              <div 
                className="bg-brand-600 h-full transition-all duration-300 rounded-full" 
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Stepper Steps Row */}
          <div className="grid grid-cols-5 gap-1.5 border-t border-slate-100 pt-4">
            {steps.map((s) => {
              const isActive = s.number === currentStep;
              const isCompleted = s.number < currentStep;

              return (
                <div 
                  key={s.number} 
                  className={`flex flex-col items-center text-center space-y-1.5 cursor-pointer select-none group`}
                  onClick={() => {
                    // Allow navigation directly to previously configured steps
                    if (s.number < currentStep) {
                      handleEditStep(s.number);
                    }
                  }}
                >
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                    isActive 
                      ? 'bg-brand-600 text-white border-brand-600 shadow-md ring-2 ring-brand-100 scale-105' 
                      : isCompleted 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                  }`}>
                    {isCompleted ? <Check className="h-4 w-4" /> : s.number}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${
                    isActive ? 'text-brand-600' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Step Panel Card */}
        <Card 
          title={steps[currentStep - 1].name}
          bodyClassName="p-6 space-y-6"
        >

          {/* ================= STEP 1: DOCUMENT TYPE & DOMAIN ================= */}
          {currentStep === 1 && (
            <div className="space-y-6">
              
              {/* Document Types Grid */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Document Type <span className="text-red-500">*</span>
                </label>
                
                {errors.documentType && (
                  <p className="text-xs text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded-lg border border-red-100">
                    <Info className="h-3.5 w-3.5" /> {errors.documentType}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {DOCUMENT_TYPES.map((type) => {
                    const IconComp = getTypeIcon(type);
                    const isSelected = formData.documentType === type;
                    return (
                      <div
                        key={type}
                        onClick={() => handleTypeSelect(type)}
                        className={`bg-white border rounded-xl p-4 flex items-center space-x-3.5 cursor-pointer transition-all duration-200 group ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50/50 shadow-md ring-1 ring-brand-400'
                            : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg border ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-500'
                            : 'bg-slate-50 text-slate-500 border-slate-200 group-hover:text-brand-600'
                        }`}>
                          <IconComp className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 leading-tight">
                          {type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Document Name Input */}
              {formData.documentType === 'Custom Document' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fadeIn">
                  <Input
                    label="Custom Document Type Name"
                    placeholder="e.g. Standard Operating Procedure (SOP)"
                    value={formData.customDocumentName}
                    error={errors.customDocumentName}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, customDocumentName: e.target.value }));
                      clearFieldError('customDocumentName');
                    }}
                    required
                  />
                </div>
              )}

              {/* Domains Selection */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Domain / Focus Area <span className="text-red-500">*</span>
                </label>
                
                {(errors.selectedDomains || errors.domain) && (
                  <p className="text-xs text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded-lg border border-red-100">
                    <Info className="h-3.5 w-3.5" /> {errors.selectedDomains || errors.domain}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {DOMAINS.map((domain) => {
                    const isSelected = formData.selectedDomains?.includes(domain);
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => handleDomainSelect(domain)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {domain}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Domain Input */}
              {formData.selectedDomains?.includes('Other') && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fadeIn">
                  <Input
                    label="Specify Custom Domain"
                    placeholder="e.g. Astrochemistry, Bioinformatic Sequencing"
                    value={formData.customDomain}
                    error={errors.customDomain}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, customDomain: e.target.value }));
                      clearFieldError('customDomain');
                    }}
                    required
                  />
                </div>
              )}

            </div>
          )}

          {/* ================= STEP 2: DOCUMENT INFORMATION ================= */}
          {currentStep === 2 && (
            <div className="space-y-5">
              
              {/* Title Field */}
              <Input
                label="Document Title"
                placeholder="e.g. Evaluating Quantum Annealing in Logistics Optimization"
                value={formData.title}
                error={errors.title}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, title: e.target.value }));
                  clearFieldError('title');
                }}
                required
              />

              {/* Abstract / Main Idea Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="abstract" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Main Idea / Abstract <span className="text-slate-400 font-normal lowercase">(Optional)</span>
                  </label>
                  <span className={`text-[10px] font-bold ${
                    formData.abstract.length > 500 ? 'text-amber-600' : 'text-slate-400'
                  }`}>
                    {formData.abstract.length} characters
                  </span>
                </div>
                <textarea
                  id="abstract"
                  rows={4}
                  placeholder="Provide a summary of the core concepts, research hypothesis, or main objectives of this document draft..."
                  value={formData.abstract}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, abstract: e.target.value }));
                    clearFieldError('abstract');
                  }}
                  className="block w-full rounded-lg border border-slate-300 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 px-3.5 py-2 text-slate-800"
                />
              </div>

              {/* Dynamic Objectives list */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Document Objectives / Core Sections
                  </label>
                  <Button 
                    variant="text" 
                    size="sm" 
                    icon={Plus} 
                    onClick={addObjective}
                    className="text-brand-600 font-bold"
                  >
                    Add Objective
                  </Button>
                </div>
                
                <p className="text-[10px] text-slate-400">Define the core targets or components this document aims to address.</p>

                <div className="space-y-2">
                  {formData.objectives.map((obj, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder={`Objective #${index + 1} (e.g. Analyze benchmark performance limits)`}
                          value={obj}
                          onChange={(e) => handleObjectiveChange(index, e.target.value)}
                          className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        />
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => removeObjective(index)}
                        disabled={formData.objectives.length <= 1}
                        className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Context Field */}
              <div className="space-y-1.5 pt-2">
                <label htmlFor="context" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Additional Context (Optional)
                </label>
                <textarea
                  id="context"
                  rows={3}
                  placeholder="Provide background references, organizational requirements, or context points that don't fit into the abstract..."
                  value={formData.additionalContext}
                  onChange={(e) => setFormData(prev => ({ ...prev, additionalContext: e.target.value }))}
                  className="block w-full rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 px-3.5 py-2 text-slate-800"
                />
              </div>

            </div>
          )}

          {/* ================= STEP 3: REFERENCE MATERIAL ================= */}
          {currentStep === 3 && (
            <div className="space-y-6">
              
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('wizard-file-input').click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-3 cursor-pointer transition-all duration-200 ${
                  isDragging 
                    ? 'border-brand-500 bg-brand-50/50' 
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-400'
                }`}
              >
                <input 
                  type="file" 
                  id="wizard-file-input" 
                  multiple 
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleFileBrowse}
                />
                <div className={`p-3 bg-white rounded-full shadow-premium border border-slate-200 text-slate-400 ${
                  isDragging ? 'text-brand-600 scale-105 transition-transform' : ''
                }`}>
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Drag reference files here, or <span className="text-brand-600 hover:underline">browse</span>
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">Accepts PDF, DOCX, or TXT (Max 10MB per file)</p>
                </div>
              </div>

              {/* File validation messages */}
              {fileError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 flex items-start gap-2 animate-fadeIn">
                  <AlertTriangle className="h-4 w-4 text-red-655 text-red-650 flex-shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Uploaded Files List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Selected Files ({formData.referenceFiles.length})
                </h4>

                {formData.referenceFiles.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 p-4 border border-dashed border-slate-200 rounded-xl text-center">
                    No reference files selected yet. You can proceed without references, or upload now.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {formData.referenceFiles.map((file, idx) => (
                      <div 
                        key={idx} 
                        className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between gap-3 shadow-premium"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 flex-shrink-0">
                            <File className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate leading-tight">
                              {file.name}
                            </h5>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                              <Badge variant={getFileBadgeColor(file.name)} className="text-[8px] py-0 px-1 font-bold">
                                {file.name.split('.').pop().toUpperCase()}
                              </Badge>
                              <span>•</span>
                              <span>{formatFileSize(file.size)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-transparent hover:border-red-100 rounded-md transition-colors flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Informational Box */}
              <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg text-[10.5px] text-brand-700 leading-normal">
                <strong>Phase 2 Notice:</strong> Selected files are held temporarily in React memory only. No data is sent to backend servers, and page reload will clear the selection.
              </div>

            </div>
          )}

          {/* ================= STEP 4: DOCUMENT PREFERENCES ================= */}
          {currentStep === 4 && (
            <div className="space-y-5">
              
              {/* Dropdowns / Pills for Language, style, detail level */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Language selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Language
                  </label>
                  <div className="flex gap-2">
                    {LANGUAGES.map((lang) => {
                      const isSelected = formData.language === lang;
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, language: lang }))}
                          className={`flex-1 py-1.5 border rounded-lg text-xs font-bold text-center transition-all ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-400'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-655 text-slate-600'
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Writing Style */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Writing Style
                  </label>
                  <select
                    value={formData.writingStyle}
                    onChange={(e) => setFormData(prev => ({ ...prev, writingStyle: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-800"
                  >
                    {WRITING_STYLES.map((style) => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>

                {/* Detail Level */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Detail Level
                  </label>
                  <select
                    value={formData.detailLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, detailLevel: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-800"
                  >
                    {DETAIL_LEVELS.map((dl) => (
                      <option key={dl} value={dl}>{dl}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Target Audience */}
              <Input
                label="Target Audience"
                placeholder="e.g. Industry Specialists, Peer Reviewers, Corporate Stakeholders"
                value={formData.targetAudience}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
              />

              {/* Additional Instructions */}
              <div className="space-y-1.5">
                <label htmlFor="instructions" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Additional Instructions
                </label>
                <textarea
                  id="instructions"
                  rows={3}
                  placeholder="e.g. Use active voice; format mathematical symbols in LaTeX style; focus heavily on the data evaluation section..."
                  value={formData.additionalInstructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, additionalInstructions: e.target.value }))}
                  className="block w-full rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 px-3.5 py-2 text-slate-850"
                />
              </div>

              {/* Optional sections checkboxes tiles */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Structure Inclusions
                </label>
                <p className="text-[10px] text-slate-400">Select auxiliary structures to include in the generated output template.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'includeTableOfContents', label: 'Table of Contents', desc: 'Adds outline catalog' },
                    { key: 'includeReferences', label: 'References Section', desc: 'Citations bibliography catalog' },
                    { key: 'includeExecutiveSummary', label: 'Executive Summary', desc: 'Brief highlight overview' }
                  ].map((tile) => {
                    const isChecked = formData[tile.key];
                    return (
                      <div
                        key={tile.key}
                        onClick={() => setFormData(prev => ({ ...prev, [tile.key]: !prev[tile.key] }))}
                        className={`border rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
                          isChecked 
                            ? 'border-brand-500 bg-brand-50/50 shadow-sm' 
                            : 'border-slate-200 hover:border-brand-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xs font-bold text-slate-800">{tile.label}</span>
                          <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">{tile.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ================= STEP 5: REVIEW ================= */}
          {currentStep === 5 && (
            <div className="space-y-6">
              
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-800">Framework Configuration Complete</h4>
                  <p className="text-[10px] text-emerald-700 leading-normal mt-0.5">
                    Review your configured settings below. You can edit any section. Once finalized, continue to the editor workspace placeholder.
                  </p>
                </div>
              </div>

              {/* Review Sections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                
                {/* Document Type & Domain */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white relative">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      1. Document
                    </h4>
                    <Button variant="text" size="sm" icon={Pencil} onClick={() => handleEditStep(1)} className="p-1 h-auto text-brand-600">
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Document Type</span>
                      <span className="font-bold text-slate-800">{formData.documentType}</span>
                    </div>
                    {formData.documentType === 'Custom Document' && (
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Custom Type Name</span>
                        <span className="font-bold text-slate-800">{formData.customDocumentName}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Domain</span>
                      <span className="font-bold text-slate-800">
                        {formData.selectedDomains && formData.selectedDomains.length > 0
                          ? formData.selectedDomains.join(', ')
                          : 'None selected'}
                      </span>
                    </div>
                    {formData.selectedDomains?.includes('Other') && (
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Custom Domain Name</span>
                        <span className="font-bold text-slate-800">{formData.customDomain}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Information */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white relative">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      2. Information
                    </h4>
                    <Button variant="text" size="sm" icon={Pencil} onClick={() => handleEditStep(2)} className="p-1 h-auto text-brand-600">
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Title</span>
                      <span className="font-bold text-slate-800">{formData.title}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Main Idea / Abstract</span>
                      <p className="font-medium text-slate-600 line-clamp-3 leading-relaxed mt-0.5">
                        {formData.abstract?.trim() || <span className="text-slate-400 font-normal italic">None provided</span>}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Objectives</span>
                      <ol className="list-decimal list-inside font-bold text-slate-800 space-y-0.5 mt-0.5">
                        {formData.objectives.filter(o => o.trim() !== '').map((o, idx) => (
                          <li key={idx} className="truncate">{o}</li>
                        ))}
                        {formData.objectives.filter(o => o.trim() !== '').length === 0 && (
                          <span className="text-slate-400 font-normal italic">None defined</span>
                        )}
                      </ol>
                    </div>
                    {formData.additionalContext && (
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Additional Context</span>
                        <p className="text-slate-655 font-medium text-slate-600 line-clamp-2 mt-0.5">{formData.additionalContext}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reference Material */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white relative">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      3. Reference Material
                    </h4>
                    <Button variant="text" size="sm" icon={Pencil} onClick={() => handleEditStep(3)} className="p-1 h-auto text-brand-600">
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Uploaded Files</span>
                    {formData.referenceFiles.length === 0 ? (
                      <p className="text-slate-400 italic text-[11px] py-1">No reference files uploaded.</p>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        {formData.referenceFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg">
                            <span className="font-bold text-slate-800 truncate max-w-[180px]">{file.name}</span>
                            <span className="text-[10px] text-slate-400 flex-shrink-0">{formatFileSize(file.size)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Preferences */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white relative">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      4. Preferences
                    </h4>
                    <Button variant="text" size="sm" icon={Pencil} onClick={() => handleEditStep(4)} className="p-1 h-auto text-brand-600">
                      Edit
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Language</span>
                      <span className="font-bold text-slate-800">{formData.language}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Writing Style</span>
                      <span className="font-bold text-slate-800">{formData.writingStyle}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Detail Level</span>
                      <span className="font-bold text-slate-800">{formData.detailLevel}</span>
                    </div>
                    {formData.targetAudience && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Target Audience</span>
                        <span className="font-bold text-slate-800 truncate block">{formData.targetAudience}</span>
                      </div>
                    )}
                    {formData.additionalInstructions && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Additional Instructions</span>
                        <p className="text-slate-655 font-medium text-slate-600 line-clamp-2 mt-0.5">{formData.additionalInstructions}</p>
                      </div>
                    )}
                    <div className="col-span-2 space-y-1 pt-1 border-t border-slate-100 mt-1">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1.5">Inclusions</span>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={formData.includeTableOfContents ? 'success' : 'default'} className="text-[9px] py-0 px-2">
                          Table of Contents
                        </Badge>
                        <Badge variant={formData.includeReferences ? 'success' : 'default'} className="text-[9px] py-0 px-2">
                          References
                        </Badge>
                        <Badge variant={formData.includeExecutiveSummary ? 'success' : 'default'} className="text-[9px] py-0 px-2">
                          Executive Summary
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Bottom Action Controls */}
          <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="outline"
              size="md"
              icon={ChevronLeft}
              onClick={handleBack}
            >
              Back
            </Button>
            
            {currentStep < 5 ? (
              <Button
                variant="primary"
                size="md"
                icon={ChevronRight}
                iconPosition="right"
                onClick={handleContinue}
              >
                Continue
              </Button>
            ) : (
              <div className="flex flex-col items-end space-y-1">
                <Button
                  variant="primary"
                  size="md"
                  icon={Sparkles}
                  iconPosition="right"
                  onClick={handleFinish}
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (progressMessage || 'Generating Report...') : 'Continue to Editor'}
                </Button>
                {isSubmitting && progressMessage && (
                  <span className="text-[11px] font-medium text-brand-600 animate-pulse">
                    {progressMessage}
                  </span>
                )}
              </div>
            )}
          </div>

        </Card>
      </div>
    </DashboardLayout>
  );
};
