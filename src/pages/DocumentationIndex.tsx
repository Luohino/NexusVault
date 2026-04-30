import React from 'react';
import { Link } from 'react-router-dom';
import { Book, Shield, Scale, Zap, Users, Globe, FileText, ChevronRight, ArrowLeft } from 'lucide-react';

const CATEGORIES = [
  {
    title: "Core Lore & Identity",
    icon: <Book className="size-6 text-white" />,
    color: "bg-red-600",
    files: [
      { name: "The Anomaly Manifesto", path: "THE_ANOMALY_MANIFESTO.md" },
      { name: "Project Roadmap", path: "ROADMAP.md" },
      { name: "Architecture Protocol", path: "ARCHITECTURE.md" },
      { name: "Glossary of Terms", path: "GLOSSARY.md" },
      { name: "Official Credits", path: "CREDITS.md" },
      { name: "Author Directory", path: "AUTHORS.md" }
    ]
  },
  {
    title: "Legal & Privacy Hub",
    icon: <Scale className="size-6 text-white" />,
    color: "bg-zinc-900",
    files: [
      { name: "Official License", path: "LICENSE" },
      { name: "Privacy Policy", path: "PRIVACY.md" },
      { name: "Terms of Service", path: "TERMS.md" },
      { name: "EU SCC Addendum", path: "EU_SCC_ADDENDUM.md" },
      { name: "Data Portability", path: "DATA_PORTABILITY_GUIDE.md" },
      { name: "DMCA Policy", path: "DMCA.md" },
      { name: "NDA Template", path: "NDA_TEMPLATE.md" },
      { name: "Trademark Guidelines", path: "TRADEMARK.md" }
    ]
  },
  {
    title: "Security & Sovereignty",
    icon: <Shield className="size-6 text-white" />,
    color: "bg-red-600",
    files: [
      { name: "Security Policy", path: "SECURITY.md" },
      { name: "Vulnerability Disclosure", path: "VULNERABILITY_DISCLOSURE_POLICY.md" },
      { name: "Incident Response", path: "INCIDENT_RESPONSE_PLAN.md" },
      { name: "Disaster Recovery", path: "DISASTER_RECOVERY_PROTOCOL.md" },
      { name: "Sovereign Identity", path: "SOVEREIGN_IDENTITY_CHARTER.md" },
      { name: "Crypto Standards", path: "CRYPTOGRAPHIC_STANDARDS.md" },
      { name: "Risk Registry", path: "RISK_REGISTRY.md" },
      { name: "Security Playbook", path: "SECURITY_PLAYBOOK.md" }
    ]
  },
  {
    title: "Engineering & SRE",
    icon: <Zap className="size-6 text-white" />,
    color: "bg-zinc-900",
    files: [
      { name: "Coding Standards", path: "CODING_STANDARDS.md" },
      { name: "UI Style Guide", path: "STYLE_GUIDE.md" },
      { name: "SRE Charter", path: "SRE_CHARTER.md" },
      { name: "DevOps Handbook", path: "DEVOPS_HANDBOOK.md" },
      { name: "Deployment Playbook", path: "DEPLOYMENT_PLAYBOOK.md" },
      { name: "Database Schema", path: "SCHEMA_GUIDE.md" },
      { name: "API Reference", path: "API_REFERENCE.md" },
      { name: "Testing Standards", path: "TESTING_STANDARDS.md" }
    ]
  },
  {
    title: "Ethics & Governance",
    icon: <Globe className="size-6 text-white" />,
    color: "bg-red-600",
    files: [
      { name: "ESG Commitment", path: "ESG_COMMITMENT.md" },
      { name: "Governance Charter", path: "GOVERNANCE_CHARTER.md" },
      { name: "Human Rights Policy", path: "HUMAN_RIGHTS_POLICY.md" },
      { name: "Environmental Impact", path: "ENVIRONMENTAL_IMPACT.md" },
      { name: "Anti-Corruption", path: "ANTI_CORRUPTION_POLICY.md" },
      { name: "Modern Slavery", path: "MODERN_SLAVERY_STATEMENT.md" },
      { name: "CSR Policy", path: "CSR_POLICY.md" },
      { name: "Diversity Charter", path: "DIVERSITY_INCLUSION_CHARTER.md" }
    ]
  },
  {
    title: "Operations & Support",
    icon: <Users className="size-6 text-white" />,
    color: "bg-zinc-900",
    files: [
      { name: "User Manual", path: "USER_MANUAL.md" },
      { name: "Troubleshooting", path: "TROUBLESHOOTING.md" },
      { name: "Official Support", path: "SUPPORT.md" },
      { name: "API SLA", path: "API_SLA.md" },
      { name: "Beta Terms", path: "BETA_TOS.md" },
      { name: "Advisory Board", path: "ADVISORY_BOARD.md" },
      { name: "Stakeholder Engagement", path: "STAKEHOLDER_ENGAGEMENT_POLICY.md" },
      { name: "Compliance Manual", path: "COMPLIANCE_MANUAL.md" }
    ]
  }
];

export const DocumentationIndex: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fafafa] pt-24 pb-20 px-6 font-['Inter']">
      <div className="max-w-7xl mx-auto">
        {/* BACK BUTTON */}
        <div className="mb-8 md:mb-12">
          <Link 
            to="/" 
            className="group inline-flex items-center gap-3 bg-black text-white px-5 py-2 md:px-6 md:py-3 font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            Back to Command
          </Link>
        </div>

        {/* HEADER */}
        <div className="mb-12 md:mb-20">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-tighter leading-[0.8] mb-6 md:mb-8">
            Document <br />
            <span className="text-red-600">Vault</span>
          </h1>
          <p className="text-base md:text-xl font-medium text-zinc-500 max-w-sm md:max-w-xl leading-snug">
            The complete 100-file governance and engineering stack for the NexusVault anomaly network. Radical transparency in every line of code.
          </p>
        </div>

        {/* CATEGORY GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {CATEGORIES.map((cat, idx) => (
            <div key={idx} className="group relative">
              {/* CATEGORY CARD */}
              <div className="bg-white border-4 border-black p-6 h-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] transition-all duration-200">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`p-3 border-2 border-black ${cat.color}`}>
                    {cat.icon}
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight leading-none">
                    {cat.title}
                  </h2>
                </div>

                <div className="space-y-1">
                  {cat.files.map((file, fIdx) => (
                    <Link
                      key={fIdx}
                      to={`/docs/${file.path}`}
                      className="flex items-center justify-between p-2 text-[13px] font-bold text-zinc-500 hover:text-black hover:bg-zinc-50 transition-colors border-b border-transparent hover:border-zinc-100"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="size-4 text-zinc-300" />
                        {file.name}
                      </div>
                      <ChevronRight className="size-3 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SEARCH CALLOUT */}
        <div className="mt-20 p-8 bg-zinc-100 border-4 border-black border-dashed flex flex-col items-center text-center">
          <h3 className="text-lg font-black uppercase mb-2">Can't find a specific protocol?</h3>
          <p className="font-mono text-xs font-bold text-zinc-500 uppercase mb-4">
            Search our full internal knowledge base or contact the Council of Sentinels.
          </p>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-black text-white font-black uppercase text-sm hover:bg-red-600 transition-colors">
              Internal Search
            </button>
            <Link 
              to="/support" 
              className="px-6 py-3 bg-white border-2 border-black font-black uppercase text-sm hover:bg-black hover:text-white transition-all"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
