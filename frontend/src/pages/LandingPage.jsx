import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  FileSpreadsheet,
  Cpu,
  BarChart3,
  Building,
  FileSignature,
  Code,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Search,
  MessageSquare,
  Network,
  History,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

export const LandingPage = () => {
  const features = [
    {
      title: 'Context-Aware Generation',
      description: 'DocAI ingests your background files, research papers, and rough notes to generate highly accurate document frameworks that sound like you.',
      icon: Network
    },
    {
      title: 'Multi-Domain Documents',
      description: 'Support for multiple categories including academic research papers, corporate project reports, security policies, and grant proposals.',
      icon: BookOpen
    },
    {
      title: 'Intelligent Editing',
      description: 'Refining prose is effortless. Highlight text to rewrite, expand, summarize, or translate while preserving technical semantics.',
      icon: RefreshCw
    },
    {
      title: 'AI Document Assistant',
      description: 'Interact with the document directly in real-time using natural language. Ask it to cross-reference data or draft missing sections.',
      icon: MessageSquare
    },
    {
      title: 'AI Diagrams & Tables',
      description: 'Generate flowcharts, tables, and sequence diagrams directly in place to visualize complex architectures or data trends.',
      icon: BarChart3
    },
    {
      title: 'Document History & Versions',
      description: 'Track granular changes over time. Access previous edits, roll back specific changes, or evaluate human vs. AI contributions.',
      icon: History
    }
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Provide Context',
      description: 'Upload reference materials, raw research notes, outlines, or style guides into the workspace context bin.'
    },
    {
      step: '02',
      title: 'Understand',
      description: 'Our context engines analyze the vocabulary, formatting rules, and technical objectives of your materials.'
    },
    {
      step: '03',
      title: 'Generate',
      description: 'Create draft frameworks, chapters, technical specifications, or executive summaries using semantic parameters.'
    },
    {
      step: '04',
      title: 'Refine',
      description: 'Iterate together with inline rewriting, structural reviews, and conversational editing directly inside the document.'
    }
  ];

  const docTypes = [
    { title: 'Research Paper', icon: BookOpen, desc: 'Academic formats with footnotes, bibliographies, and abstracts.' },
    { title: 'Project Report', icon: FileSpreadsheet, desc: 'Project plans, milestone reports, and status updates.' },
    { title: 'Technical Documentation', icon: Cpu, desc: 'System specs, API manuals, and setup wikis.' },
    { title: 'Business Report', icon: BarChart3, desc: 'Market analyses, financial summaries, and operations plans.' },
    { title: 'Company Profile', icon: Building, desc: 'Mission statements, core team sheets, and values.' },
    { title: 'Proposal', icon: FileSignature, desc: 'Grant bids, commercial client pricing, and SLA structures.' },
    { title: 'Software Specification', icon: Code, desc: 'Functional criteria, constraints, and architecture logs.' },
    { title: 'Policy Document', icon: ShieldAlert, desc: 'Legal and administrative regulations, terms, and codes.' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Headings & CTAs */}
            <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-brand-50 border border-brand-100 rounded-full text-brand-700 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Phase 1 — UI Foundation ready</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Create Smarter Documents with <span className="text-brand-600">AI</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                DocAI is an intelligent co-writing platform built to help authors draft, refine, and organize research papers, technical specs, and corporate reports using their own reference files and context.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto" icon={ArrowRight} iconPosition="right">
                    Create Your Document
                  </Button>
                </Link>
                <a href="#features" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Explore Features
                  </Button>
                </a>
              </div>
            </div>

            {/* Right Column: React-based Workspace Mockup */}
            <div className="lg:col-span-7 flex justify-center w-full">
              <div className="w-full max-w-2xl bg-slate-900 rounded-xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col text-xs text-slate-400 font-sans h-[380px]">
                
                {/* Mock Browser Title Bar */}
                <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <span className="pl-3 text-[10px] text-slate-500 font-mono tracking-wider uppercase">DocAI WORKSPACE PREVIEW</span>
                  </div>
                  <div className="h-4.5 w-32 bg-slate-850 rounded border border-slate-700/50 flex items-center justify-center text-[9px] text-slate-600">
                    docai-workspace/evaluation
                  </div>
                </div>

                {/* Mock Workspace Body Split */}
                <div className="flex-1 flex overflow-hidden">
                  
                  {/* Left: Document Editor Canvas */}
                  <div className="flex-grow bg-white p-5 overflow-y-auto flex flex-col justify-between text-slate-800">
                    <div className="space-y-4">
                      {/* Document Title */}
                      <div className="border-b border-slate-100 pb-3">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-brand-600">RESEARCH PAPER</div>
                        <h2 className="text-base font-extrabold text-slate-900 mt-1 leading-tight">AI-Based Healthcare System Evaluation</h2>
                      </div>
                      
                      {/* Document Paragraphs */}
                      <div className="space-y-2 text-[10.5px] leading-relaxed text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-900">Abstract —</span> Neural transformers have shown considerable strength in sequence predictions. This paper evaluates the clinical efficacy of deploying context-aware modules for patient recovery tracking...
                        </p>
                        <p className="bg-brand-50 border-l-2 border-brand-500 p-2 text-slate-800 rounded-r">
                          <span className="font-semibold">Contextual Highlight:</span> The training parameters were adapted to handle patient histories containing sparse entries. [Rewrite Selection ⚡]
                        </p>
                      </div>
                    </div>

                    {/* Bottom Status bar */}
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[9px] text-slate-400">
                      <span>Words: 1,280</span>
                      <span>IEEE Template Selected</span>
                    </div>
                  </div>

                  {/* Right: AI Assistant Sidebar */}
                  <div className="w-56 bg-slate-950 border-l border-slate-850 p-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Assistant Header */}
                      <div className="flex items-center space-x-1.5 text-white font-semibold">
                        <Sparkles className="h-3.5 w-3.5 text-brand-400 animate-pulse" />
                        <span>DocAI Assistant</span>
                      </div>

                      {/* Chat messages */}
                      <div className="space-y-3">
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                          <p className="text-[9px] text-slate-500 font-medium">YOU</p>
                          <p className="text-[10px] text-slate-300 mt-0.5">Could you format this abstract to conform to standard IEEE requirements?</p>
                        </div>
                        <div className="bg-brand-950/20 border border-brand-900/40 p-2.5 rounded-lg">
                          <p className="text-[9px] text-brand-400 font-semibold">ASSISTANT</p>
                          <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">Sure! I have structured the layout. Shall I insert the Methods segment?</p>
                          <button className="mt-2 px-2 py-0.5 bg-brand-600 hover:bg-brand-700 text-white rounded font-medium text-[9px] transition-colors">
                            Insert Paragraph
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-850 pt-3">
                      <div className="bg-slate-900 rounded p-1.5 border border-slate-800 flex items-center">
                        <input
                          type="text"
                          placeholder="Ask assistant to edit..."
                          className="bg-transparent border-none outline-none flex-grow text-[9px] text-slate-300 placeholder-slate-600"
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Intelligent Document Features</h2>
            <p className="text-slate-500 text-sm">
              Explore the advanced features engineered to support professional researchers, writers, and technical administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <Card
                key={idx}
                hoverable
                bodyClassName="p-6 flex flex-col space-y-4"
              >
                <div className="p-3 bg-brand-50 rounded-lg text-brand-600 self-start border border-brand-100">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900">{feature.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Linear Flow */}
      <section id="how-it-works" className="py-20 bg-slate-50 border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">How It Works</h2>
            <p className="text-slate-500 text-sm">
              The four core components of the DocAI workflow engineered to produce reliable, high-fidelity technical writing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {workflowSteps.map((step, idx) => (
              <div key={idx} className="relative flex flex-col space-y-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-3xl font-black text-brand-200 font-mono">{step.step}</span>
                <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Document Types Gallery */}
      <section id="document-types" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Support For Any Writing Domain</h2>
            <p className="text-slate-500 text-sm">
              Choose from pre-set structural parameters designed for standard enterprise, engineering, and academic document types.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {docTypes.map((type, idx) => (
              <div
                key={idx}
                className="p-5 border border-slate-200 hover:border-brand-300 hover:shadow-premium rounded-xl bg-white transition-all group flex flex-col space-y-3"
              >
                <div className="p-2.5 bg-slate-50 group-hover:bg-brand-50 border border-slate-100 group-hover:border-brand-100 rounded-lg text-slate-600 group-hover:text-brand-600 self-start transition-colors">
                  <type.icon className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">{type.title}</h4>
                <p className="text-xs text-slate-500 leading-normal">{type.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Human-AI Collaboration Section */}
      <section id="about" className="py-20 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left */}
            <div className="lg:col-span-6 space-y-6">
              <h2 className="text-3xl font-extrabold tracking-tight">
                Built for Human-AI Document Collaboration
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
                Instead of simple chatbot generation that generates massive blocks of text containing inaccuracies, DocAI works alongside you. The human sets parameters, provides files, and guides revisions while the AI processes style requirements and formats drafts.
              </p>
              <div className="space-y-3">
                {[
                  'Contextual integrity: All edits are backed by references',
                  'Interactive interface: Co-author with an inline editor',
                  'Audited edits: Clear version tracking of changes'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4.5 w-4.5 text-brand-400" />
                    <span className="text-xs font-medium text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Human-AI-Doc Schema Diagram */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center space-y-6 font-mono text-xs">
                
                {/* Human Node */}
                <div className="w-36 py-3 bg-slate-900 rounded-lg border border-slate-800 text-center shadow-md">
                  <span className="font-semibold text-slate-300">👨‍💻 Human Author</span>
                  <div className="text-[9px] text-slate-500 mt-1">Review & Directs</div>
                </div>

                {/* Connector Arrow */}
                <div className="flex flex-col items-center text-brand-400">
                  <span className="animate-bounce">↕</span>
                  <span className="text-[9px] text-slate-500">Contextual Prompting</span>
                </div>

                {/* DocAI Center Node */}
                <div className="w-40 py-4 bg-brand-950/40 rounded-xl border border-brand-900/50 text-center shadow-md shadow-brand-900/5">
                  <span className="font-bold text-white flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                    DocAI Engine
                  </span>
                  <div className="text-[9px] text-brand-400 mt-1">Semantic Transformer</div>
                </div>

                {/* Connector Arrow */}
                <div className="flex flex-col items-center text-brand-400">
                  <span className="animate-bounce">↕</span>
                  <span className="text-[9px] text-slate-500">Structure Compilation</span>
                </div>

                {/* Document Node */}
                <div className="w-36 py-3 bg-slate-900 rounded-lg border border-slate-800 text-center shadow-md">
                  <span className="font-semibold text-slate-300">📄 Final Document</span>
                  <div className="text-[9px] text-slate-500 mt-1">PDF / DOCX Structure</div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand-600 text-white relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight">Ready to build your next document?</h2>
          <p className="text-brand-100 text-sm max-w-xl mx-auto leading-relaxed">
            Start with your ideas, uploaded context, or reference notes. Our UI framework is ready to help you shape drafts.
          </p>
          <div className="pt-2">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="bg-white hover:bg-slate-100 text-brand-700 shadow-lg">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
