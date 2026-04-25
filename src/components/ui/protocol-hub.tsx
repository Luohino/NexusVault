import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Shield, Scale, Zap, Globe, Book, ChevronRight } from 'lucide-react';

const PROTOCOLS = [
  {
    cat: "LEGAL",
    files: ["LICENSE", "PRIVACY.md", "TERMS.md", "ACCEPTABLE_USE_POLICY.md", "DMCA.md", "TRADEMARK.md", "LAW_ENFORCEMENT_GUIDELINES.md", "EXPORT_COMPLIANCE.md", "NDA_TEMPLATE.md", "CONTRIBUTOR_LICENSE_AGREEMENT.md", "EU_SCC_ADDENDUM.md", "BETA_TESTER_AGREEMENT.md", "DATA_SHARING_AGREEMENT.md", "NON_SOLICITATION.md", "SUBPROCESSORS.md", "TAX_AND_PAYMENT_TERMS.md"]
  },
  {
    cat: "SECURITY",
    files: ["SECURITY.md", "VULNERABILITY_DISCLOSURE_POLICY.md", "INCIDENT_RESPONSE_PLAN.md", "VULNERABILITY_MANAGEMENT.md", "DISASTER_RECOVERY_PROTOCOL.md", "CRYPTOGRAPHIC_STANDARDS.md", "RISK_REGISTRY.md", "DATA_CLASSIFICATION_POLICY.md", "CYBER_HYGIENE.md", "SECURITY_PLAYBOOK.md", "INTERNAL_AUDIT.md", "CHANGE_MANAGEMENT.md", "IT_ASSET_POLICY.md", "VENDOR_RISK_ASSESSMENT.md"]
  },
  {
    cat: "ENGINEERING",
    files: ["ARCHITECTURE.md", "CODING_STANDARDS.md", "STYLE_GUIDE.md", "DEVOPS_HANDBOOK.md", "SRE_CHARTER.md", "DEPLOYMENT_PLAYBOOK.md", "SCHEMA_GUIDE.md", "API_REFERENCE.md", "TESTING_STANDARDS.md", "BRANCHING_STRATEGY.md", "CODE_REVIEW_CHECKLIST.md", "API_USAGE_POLICY.md", "DEPRECATION_POLICY.md", "LOCAL_DEVELOPMENT_GUIDE.md", "ISSUE_TRIAGE_POLICY.md", "LABEL_GUIDELINES.md", "REMEDIATION_PLAN.md"]
  },
  {
    cat: "ETHICS",
    files: ["THE_ANOMALY_MANIFESTO.md", "ESG_COMMITMENT.md", "GOVERNANCE_CHARTER.md", "HUMAN_RIGHTS_POLICY.md", "DIVERSITY_INCLUSION_CHARTER.md", "ENVIRONMENTAL_IMPACT.md", "ANTI_CORRUPTION_POLICY.md", "MODERN_SLAVERY_STATEMENT.md", "CSR_POLICY.md", "WHISTLEBLOWER_POLICY.md", "DPIA_POLICY.md", "PRIVACY_BY_DESIGN.md", "STAKEHOLDER_ENGAGEMENT_POLICY.md", "SOCIAL_MEDIA_POLICY.md", "ETHICAL_AI_POLICY.md"]
  },
  {
    cat: "LORE",
    files: ["ROADMAP.md", "GLOSSARY.md", "CREDITS.md", "AUTHORS.md", "PROJECT_STATUS.md", "RELEASES.md", "COMMUNITY_GUIDELINES.md", "CODE_OF_CONDUCT.md"]
  },
  {
    cat: "SUPPORT",
    files: ["USER_MANUAL.md", "TROUBLESHOOTING.md", "SUPPORT.md", "API_SLA.md", "SERVICE_LEVEL_AGREEMENT.md", "BETA_TOS.md", "ADVISORY_BOARD.md", "COMPLIANCE_MANUAL.md", "ACCESSIBILITY_STATEMENT.md", "ACCESSIBILITY_AUDIT.md", "DATA_RETENTION_POLICY.md", "RECORDS_MANAGEMENT.md", "RETENTION_SCHEDULE.md", "DATA_PORTABILITY_GUIDE.md"]
  }
];

export const ProtocolHub: React.FC = () => {
  return (
    <section className="py-24 px-6 bg-white overflow-hidden relative font-['Inter']">
      {/* Background Decal */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30vw] font-black text-zinc-50 opacity-[0.03] select-none pointer-events-none whitespace-nowrap tracking-tighter uppercase">
        PROTOCOL
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-20">
          <div className="mb-12 md:mb-20">
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.8] mb-6 md:mb-8 group">
            SOVEREIGN <br />
            <span className="text-red-600">PROTOCOL</span> <br />
            HUB
          </h1>
          <p className="text-base md:text-xl font-medium text-zinc-500 max-w-sm md:max-w-md mb-8 md:mb-12 leading-tight">
            The Vault is governed by a codified framework of 100+ professional documents. Total transparency and institutional integrity for the anomaly network.
          </p>
          </div>
          <Link 
            to="/vault" 
            className="px-10 py-5 bg-black text-white font-black uppercase tracking-[0.1em] hover:bg-red-600 transition-all duration-300 shadow-[10px_10px_0px_0px_rgba(220,38,38,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 text-lg"
          >
            Enter Full Vault
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 md:gap-y-16">
          {PROTOCOLS.map((group, idx) => (
            <div key={idx} className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 border-b-2 border-black pb-2">
                <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 tracking-widest">
                  {group.cat}
                </span>
                <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">{group.cat} PORTAL</h3>
              </div>
              <div className="flex flex-col gap-4">
                {group.files.map((file, fIdx) => (
                  <Link 
                    key={fIdx} 
                    to={`/docs/${file}`}
                    className="group flex items-center justify-between py-1 px-1 border-b border-transparent hover:border-zinc-100 transition-all"
                  >
                    <span className="font-['Inter'] text-xs font-bold text-zinc-400 group-hover:text-black truncate pr-3 transition-colors">
                      {file
                        .replace('.md', '')
                        .replaceAll('_', ' ')
                        .toLowerCase()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </span>
                    <ChevronRight className="w-3 h-3 text-red-600 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
