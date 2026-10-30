/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  GitCommit, 
  FileCode, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  Sparkles, 
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';

interface DeliverableItem {
  id: string;
  category: 'Design System Tokens' | 'Web Component Briefs' | 'Core Architecture' | 'Artisan & Client UI';
  title: string;
  filePath: string;
  description: string;
  commitMessage: string;
}

const DELIVERABLES: DeliverableItem[] = [
  {
    id: 'deliv-01',
    category: 'Design System Tokens',
    title: 'African Luxury Design Tokens & Atelier Direction',
    filePath: 'design/directions/01-luxury-atelier-design-direction.md',
    description: 'W3C Design Tokens JSON schema with Savannah Gold, Terracotta Ochre, Royal Indigo, and Carved Ebony. WCAG 2.1 AA 14.9:1 accessibility contrast ratio.',
    commitMessage: 'feat(tokens): add Pan-African haute couture design direction and W3C tokens'
  },
  {
    id: 'deliv-02',
    category: 'Web Component Briefs',
    title: 'African Garment Measurement Card Web Component Brief',
    filePath: 'design/briefs/01-measurement-card-component.md',
    description: 'Shadow DOM <stitchflow-african-measurement-card> specification for Agbada wingspan, Kaftan chest, Sokoto inseam, Fila cap, and Gele wrap dimensions.',
    commitMessage: 'docs(briefs): add African measurement card web component specification'
  },
  {
    id: 'deliv-03',
    category: 'Web Component Briefs',
    title: 'Agbada, Kaftan & Kitenge Production Stepper Brief',
    filePath: 'design/briefs/02-production-stepper-component.md',
    description: 'Shadow DOM <stitchflow-african-production-stepper> tracking 4-phase African couture pipeline: Pattern & Wax Print Alignment -> Stitching -> Basted Fitting -> Ready.',
    commitMessage: 'docs(briefs): add African couture production stepper component brief'
  },
  {
    id: 'deliv-04',
    category: 'Web Component Briefs',
    title: 'Pan-African Lookbook & Ceremonial Booking Briefs',
    filePath: 'design/briefs/03-lookbook-and-booking-briefs.md',
    description: 'Shadow DOM <stitchflow-african-lookbook-card> and <stitchflow-african-booking-engine> specifications for traditional wedding & Agbada fittings.',
    commitMessage: 'docs(briefs): add African lookbook card and ceremonial booking engine briefs'
  },
  {
    id: 'deliv-05',
    category: 'Design System Tokens',
    title: 'Pan-African Couture Design System Index',
    filePath: 'design/README.md',
    description: 'Design system index document linking tokens, components, and responsive guidelines for African fashion studios.',
    commitMessage: 'docs(design): create Pan-African couture design system index and README'
  },
  {
    id: 'deliv-06',
    category: 'Core Architecture',
    title: 'Core African Fashion Schema Types',
    filePath: 'src/types.ts',
    description: 'TypeScript interfaces for Grand Agbadas, Senator Suits, Kitenge bridal wear, Ruracio appointments, and specialized Agbada measurements.',
    commitMessage: 'feat(types): define African bespoke fashion schemas and cultural data models'
  },
  {
    id: 'deliv-07',
    category: 'Core Architecture',
    title: 'Authentic African Couture Initial Data & Profiles',
    filePath: 'src/data/initialData.ts',
    description: 'Seed data showcasing Yoruba Grand Agbada, Kenyan Ruracio Kitenge gown, Swahili Kanzu, Ghanaian Kente cape, and master artisan profiles.',
    commitMessage: 'feat(data): seed authentic African couture garments, artisans, and ceremonial records'
  },
  {
    id: 'deliv-08',
    category: 'Design System Tokens',
    title: 'CSS Custom Properties with African Earth & Ochre Colorways',
    filePath: 'src/index.css',
    description: 'CSS variables mapping tokens to root with Savannah Gold, Terracotta, Ebony, and custom scrollbar styling.',
    commitMessage: 'feat(styles): implement African earth & ochre design tokens in global stylesheet'
  },
  {
    id: 'deliv-09',
    category: 'Core Architecture',
    title: 'Atelier Context & Local Storage Persistence',
    filePath: 'src/context/StitchFlowContext.tsx',
    description: 'Reactive store managing African garments, role switching, KES/USD currency toggle, appointments, and feedback persistence.',
    commitMessage: 'feat(context): implement StitchFlow state manager with African tailoring actions'
  },
  {
    id: 'deliv-10',
    category: 'Artisan & Client UI',
    title: 'Pan-African Atelier Navigation & Role Bar',
    filePath: 'src/components/Navbar.tsx',
    description: 'Header with brand identity, 4-way role switcher (Public, Owner, Artisan, Client), currency switcher, and Deliverables Commit helper.',
    commitMessage: 'feat(ui): build Pan-African atelier navigation and multi-role switcher'
  },
  {
    id: 'deliv-11',
    category: 'Artisan & Client UI',
    title: 'WhatsApp Atelier Direct Floating Channel',
    filePath: 'src/components/FloatingWhatsApp.tsx',
    description: 'Floating anchor with pre-filled WhatsApp inquiry prompts for custom Agbada fittings, Ruracio styling, and fabric inquiries.',
    commitMessage: 'feat(ui): add floating WhatsApp communication channel for bespoke inquiries'
  },
  {
    id: 'deliv-12',
    category: 'Artisan & Client UI',
    title: 'African Ceremonial Consultation & Fitting Booking Engine',
    filePath: 'src/components/BookingModal.tsx',
    description: 'Interactive multi-step scheduler for Ruracio traditional bridal, 3-piece Agbada sizing, and Senator fittings with double-booking locks.',
    commitMessage: 'feat(ui): build interactive African ceremonial appointment booking engine'
  },
  {
    id: 'deliv-13',
    category: 'Artisan & Client UI',
    title: 'Bespoke Garment Milestone Tracker Modal',
    filePath: 'src/components/OrderTrackerModal.tsx',
    description: 'Live order tracking modal for clients and visitors to track cutting, stitching, fitting, and ready stages by Order ID or phone.',
    commitMessage: 'feat(ui): add live garment milestone tracker modal with artisan bench notes'
  },
  {
    id: 'deliv-14',
    category: 'Artisan & Client UI',
    title: 'African Couture Lookbook Showcase & Cultural Attire Portfolio',
    filePath: 'src/components/PublicPortfolio.tsx',
    description: 'Public showcase featuring Grand Agbadas, Senator suits, Kitenge gowns, fabric origins, and WhatsApp direct consultation triggers.',
    commitMessage: 'feat(ui): create African couture digital lookbook and cultural fashion portfolio'
  },
  {
    id: 'deliv-15',
    category: 'Artisan & Client UI',
    title: 'Atelier Owner Suite with Agbada & Kaftan Production Pipeline',
    filePath: 'src/components/OwnerDashboard.tsx',
    description: 'Executive dashboard with cashflow metrics, tailor bench workload distribution, 4-stage Kanban, and commission logger.',
    commitMessage: 'feat(ui): implement Atelier Director suite with African production pipeline'
  },
  {
    id: 'deliv-16',
    category: 'Artisan & Client UI',
    title: 'Mobile Artisan Workbench & African Measurement Card',
    filePath: 'src/components/TailorDashboard.tsx',
    description: 'Smartphone-optimized daily queue for tailors, 1-click stage advancement, and anatomical measurement card with Agbada wingspan.',
    commitMessage: 'feat(ui): develop mobile tailor workbench with African measurement cards'
  },
  {
    id: 'deliv-17',
    category: 'Artisan & Client UI',
    title: 'VIP Patron Portal, Ruracio Stepper & Cultural Referral Loop',
    filePath: 'src/components/ClientPortal.tsx',
    description: 'Client portal with live garment tracking, post-delivery feedback form, and viral referral generator (Give KES 3,000, Earn 15%).',
    commitMessage: 'feat(ui): add client portal with order tracking, feedback loop, and referral engine'
  }
];

export const DeliverablesManagerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { showToast } = useStitchFlow();
  const [committedList, setCommittedList] = useState<string[]>(() => {
    const saved = localStorage.getItem('stitchflow_committed_deliverables');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'committed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleCommitted = (id: string) => {
    const next = committedList.includes(id) 
      ? committedList.filter(item => item !== id)
      : [...committedList, id];
    setCommittedList(next);
    localStorage.setItem('stitchflow_committed_deliverables', JSON.stringify(next));
    showToast(`Updated deliverable status!`);
  };

  const handleCopyGitCommand = (d: DeliverableItem) => {
    const cmd = `git add ${d.filePath} && git commit -m "${d.commitMessage}"`;
    navigator.clipboard.writeText(cmd);
    setCopiedId(d.id);
    showToast(`Copied Git commit command for "${d.title}"!`);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const filtered = DELIVERABLES.filter(d => {
    if (activeTab === 'pending') return !committedList.includes(d.id);
    if (activeTab === 'committed') return committedList.includes(d.id);
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#E8E2D8] overflow-hidden text-[#1A1918]">
        
        {/* Header */}
        <div className="bg-[#161311] text-[#FAF6F0] px-6 py-5 flex items-center justify-between border-b border-[#2C241E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4A347] flex items-center justify-center text-[#161311] shadow-sm">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-white">
                  Individual Deliverables & Commit Manager
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#D4A347]/20 text-[#D4A347] border border-[#D4A347]/30">
                  {committedList.length} of {DELIVERABLES.length} Committed
                </span>
              </div>
              <p className="text-xs text-[#98897C] mt-0.5">
                Review and commit each design token, component brief, schema, and UI deliverable individually.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#98897C] hover:text-white p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Filter bar */}
        <div className="bg-[#FAF6F0] px-6 py-3 border-b border-[#E5DACB] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'all' ? 'bg-[#161311] text-white' : 'text-[#6A5D52] hover:bg-[#F3ECE1]'
              }`}
            >
              All Deliverables ({DELIVERABLES.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'pending' ? 'bg-[#161311] text-white' : 'text-[#6A5D52] hover:bg-[#F3ECE1]'
              }`}
            >
              Pending ({DELIVERABLES.length - committedList.length})
            </button>
            <button
              onClick={() => setActiveTab('committed')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'committed' ? 'bg-[#161311] text-white' : 'text-[#6A5D52] hover:bg-[#F3ECE1]'
              }`}
            >
              Committed ({committedList.length})
            </button>
          </div>

          <div className="text-[11px] text-[#6A5D52] font-mono hidden sm:block">
            CLI: git add &lt;file&gt; &amp;&amp; git commit
          </div>
        </div>

        {/* Deliverables List */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-3">
          {filtered.map((item, idx) => {
            const isCommitted = committedList.includes(item.id);

            return (
              <div 
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCommitted 
                    ? 'bg-[#F2FAF5] border-green-200' 
                    : 'bg-white border-[#E5DACB] hover:border-[#C8B69F] shadow-sm'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleCommitted(item.id)}
                      className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        isCommitted 
                          ? 'bg-green-600 text-white' 
                          : 'border-2 border-[#C8B69F] hover:border-[#161311] text-transparent'
                      }`}
                      title={isCommitted ? 'Mark as Pending' : 'Mark as Committed'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FAF6F0] border border-[#E5DACB] text-[#8C6D2D]">
                          {item.category}
                        </span>
                        <h4 className="font-bold text-sm text-[#161311]">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs text-[#6A5D52] mt-1 leading-relaxed">
                        {item.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-[#98897C]">
                        <FileCode className="w-3.5 h-3.5 text-[#D4A347]" />
                        <span>{item.filePath}</span>
                      </div>
                    </div>
                  </div>

                  {/* Git Commit Command Action */}
                  <div className="flex sm:flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyGitCommand(item)}
                      className="px-3 py-1.5 bg-[#FAF6F0] hover:bg-[#F3ECE1] border border-[#E5DACB] rounded-xl text-xs font-semibold text-[#161311] flex items-center gap-1.5 transition-colors"
                      title="Copy Git command to clipboard"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Terminal className="w-3.5 h-3.5 text-[#D4A347]" />}
                      <span>{copiedId === item.id ? 'Copied Command!' : 'Copy Commit CMD'}</span>
                    </button>

                    <button
                      onClick={() => toggleCommitted(item.id)}
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors ${
                        isCommitted 
                          ? 'text-green-700 bg-green-100 hover:bg-green-200' 
                          : 'text-[#6A5D52] hover:text-[#161311]'
                      }`}
                    >
                      {isCommitted ? '✓ Committed' : 'Mark as Committed'}
                    </button>
                  </div>
                </div>

                {/* Git commit message preview */}
                <div className="mt-2.5 pt-2 border-t border-[#F3ECE1] text-[10px] font-mono text-[#6A5D52] truncate">
                  <span className="text-[#98897C]">Commit message:</span> "{item.commitMessage}"
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-[#FAF6F0] px-6 py-4 border-t border-[#E5DACB] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6A5D52] gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#D4A347]" />
            <span>All 17 deliverables are decoupled into individual files for clean standalone git commits.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCommittedList(DELIVERABLES.map(d => d.id));
                localStorage.setItem('stitchflow_committed_deliverables', JSON.stringify(DELIVERABLES.map(d => d.id)));
                showToast('Marked all 17 deliverables as committed!');
              }}
              className="px-3 py-1.5 rounded-lg border border-[#E5DACB] bg-white hover:bg-[#F3ECE1] text-xs font-semibold"
            >
              Mark All as Committed
            </button>
            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-lg bg-[#161311] text-white hover:bg-[#2C241E] text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
