// DocAI Mock Data Service for Phase 1 Demo

export const mockUser = {
  name: "Dr. Alex Carter",
  email: "alex.carter@academic-docai.org",
  avatar: "", // empty for default initials representation
  preferences: {
    theme: "light",
    defaultDocType: "Research Paper",
    editorAutoSave: true
  }
};

export const dashboardStats = {
  totalDocuments: 12,
  drafts: 4,
  completed: 8,
  thisMonth: 5
};

export const documentTypes = [
  {
    id: "research-paper",
    title: "Research Paper",
    description: "Academic format with abstract, introduction, methodology, and citations.",
    icon: "BookOpen"
  },
  {
    id: "project-report",
    title: "Project Report",
    description: "Detailed project overview, milestones, timelines, and outcomes.",
    icon: "FileSpreadsheet"
  },
  {
    id: "technical-docs",
    title: "Technical Documentation",
    description: "System architecture, API specifications, and setup instructions.",
    icon: "Cpu"
  },
  {
    id: "business-report",
    title: "Business Report",
    description: "Corporate findings, market analyses, and financial summaries.",
    icon: "BarChart3"
  },
  {
    id: "company-profile",
    title: "Company Profile",
    description: "Mission statements, team structure, values, and client summaries.",
    icon: "Building"
  },
  {
    id: "proposal",
    title: "Proposal",
    description: "Project bids, commercial terms, resource estimates, and value propositions.",
    icon: "FileSignature"
  },
  {
    id: "software-spec",
    title: "Software Specification",
    description: "Functional requirements, user stories, and system limits.",
    icon: "Code"
  },
  {
    id: "policy-document",
    title: "Policy Document",
    description: "Guidelines, terms of operations, code of conduct, and legal compliance.",
    icon: "ShieldAlert"
  }
];

export const mockDocuments = [
  {
    id: "doc-1",
    title: "AI-Based Healthcare System Evaluation",
    type: "Research Paper",
    status: "In Progress",
    updatedAt: "2 hours ago",
    author: "Dr. Alex Carter",
    snippet: "This paper investigates the clinical efficacy of context-aware neural transformers in predicting patient recovery paths..."
  },
  {
    id: "doc-2",
    title: "GitWise AI Project Report",
    type: "Project Report",
    status: "Completed",
    updatedAt: "Yesterday",
    author: "Dr. Alex Carter",
    snippet: "Final summary on the GitWise agent integration pipeline. All milestones completed on schedule with 98% accuracy..."
  },
  {
    id: "doc-3",
    title: "Enterprise DocAI Integration Specification",
    type: "Technical Documentation",
    status: "Draft",
    updatedAt: "3 days ago",
    author: "Dr. Alex Carter",
    snippet: "System design details for embedding the DocAI context-aware editing core as an intranet service..."
  },
  {
    id: "doc-4",
    title: "Q3 Academic Grant Proposal",
    type: "Proposal",
    status: "Completed",
    updatedAt: "1 week ago",
    author: "Dr. Alex Carter",
    snippet: "Funding request for research on collaborative human-agent authorship models. Total budget requested: $250,000..."
  },
  {
    id: "doc-5",
    title: "DocAI Corporate Security Policy",
    type: "Policy Document",
    status: "Completed",
    updatedAt: "2 weeks ago",
    author: "Admin",
    snippet: "This policy establishes constraints for data containment, model fine-tuning privacy, and audit logs..."
  },
  {
    id: "doc-6",
    title: "Global Sales and Operations Plan",
    type: "Business Report",
    status: "Draft",
    updatedAt: "3 weeks ago",
    author: "Dr. Alex Carter",
    snippet: "Detailed breakdown of distribution models and operational scaling parameters for document services..."
  }
];

export const mockTemplates = [
  {
    id: "tpl-1",
    title: "IEEE Format Research Paper",
    category: "Research Paper",
    description: "Standard IEEE two-column paper format with sections for abstract, equations, and references."
  },
  {
    id: "tpl-2",
    title: "IEEE Literature Review",
    category: "Research Paper",
    description: "Comprehensive survey of state-of-the-art work in a specific technical subdomain."
  },
  {
    id: "tpl-3",
    title: "Milestone Technical Report",
    category: "Project Report",
    description: "SaaS project status layout including timeline graphs, KPIs, and resource charts."
  },
  {
    id: "tpl-4",
    title: "API Reference Manual",
    category: "Technical Documentation",
    description: "Clean markdown layout with request/response examples and error schemas."
  },
  {
    id: "tpl-5",
    title: "Annual Financial Summary",
    category: "Business Report",
    description: "Professional corporate outline with tables for P&L, balance sheets, and key charts."
  },
  {
    id: "tpl-6",
    title: "Commercial Pitch Proposal",
    category: "Proposal",
    description: "High-impact layout with executive summary, pricing packages, and SLA tiers."
  }
];
