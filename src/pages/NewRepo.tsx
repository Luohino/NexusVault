import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Book, Shield, FileText, ChevronDown, Check, Plus, Upload, X } from 'lucide-react';
import { LoadingScreen } from '../components/ui/loading-states';

const GITIGNORE_TEMPLATES = [
  { name: 'None', value: '' },
  { name: 'Node', value: 'node' },
  { name: 'Python', value: 'python' },
  { name: 'Flutter', value: 'flutter' },
  { name: 'Android', value: 'android' },
  { name: 'Go', value: 'go' },
  { name: 'Java', value: 'java' },
  { name: 'Unity', value: 'unity' },
];

const LICENSES = [
  { name: 'No license', key: '' },
  { name: 'MIT License', key: 'mit' },
  { name: 'Apache License 2.0', key: 'apache-2.0' },
  { name: 'GNU GPL v3.0', key: 'gpl-3.0' },
];

// Fallback license templates to ensure reliability
const LICENSE_TEMPLATES: Record<string, string> = {
  'mit': `MIT License\n\nCopyright (c) [year] [fullname]\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.`,
  'apache-2.0': `Apache License\nVersion 2.0, January 2004\nhttp://www.apache.org/licenses/\n\nTERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION\n... [Apache 2.0 License Body] ...`,
  'gpl-3.0': `GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n\nCopyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>\nEveryone is permitted to copy and distribute verbatim copies\nof this license document, but changing it is not allowed.\n\n... [GPL 3.0 License Body] ...`
};

export const NewRepo = () => {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [addReadme, setAddReadme] = useState(false);
  const [addNvignore, setAddNvignore] = useState(false);
  const [license, setLicense] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isLoaded) return <LoadingScreen />;
  if (!user) {
    navigate('/login');
    return null;
  }

  const userIdentifier = user.username || user.firstName || user.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const token = await getToken();
      
      let nvignoreContent = '';
      if (addNvignore) {
        // Default .nvignore content
        nvignoreContent = `# Dependencies
node_modules/
bower_components/

# Build output
dist/
build/
*.min.js
*.min.css

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Logs
npm-debug.log
yarn-error.log
*.log`;
      }

      let licenseContent = '';
      if (license) {
        // Try fetching from API first for the most up-to-date version
        try {
          const res = await fetch(`https://api.github.com/licenses/${license}`);
          if (res.ok) {
            const data = await res.json();
            licenseContent = data.body;
          }
        } catch (err) {
          console.error('Failed to fetch license from GitHub, using fallback', err);
        }

        // Use local fallback if API failed
        if (!licenseContent && LICENSE_TEMPLATES[license]) {
          licenseContent = LICENSE_TEMPLATES[license];
        }

        // Perform text replacements
        if (licenseContent) {
          licenseContent = licenseContent
            .replace(/\[year\]/g, new Date().getFullYear().toString())
            .replace(/\[fullname\]/g, user.fullName || userIdentifier)
            .replace(/<year>/g, new Date().getFullYear().toString())
            .replace(/<name of author>/g, user.fullName || userIdentifier);
        }
      }

      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name, 
          description, 
          isPrivate,
          addReadme,
          nvignoreContent,
          licenseContent,
          licenseKey: license
        }),
      });

      if (res.ok) {
        navigate(`/${userIdentifier}/${name}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create repository');
      }
    } catch (err) {
      setError('An error occurred during construction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#080808] min-h-screen text-white pb-32 font-['Inter'] selection:bg-red-500/30">
      <div className="max-w-[900px] mx-auto w-full px-4 md:px-8 pt-12 md:pt-20">
        
        {/* Institutional Header */}
        <div className="bg-white text-black p-8 md:p-12 mb-16 border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-100 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000 opacity-50"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-black flex items-center justify-center border-2 border-black">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Construction Protocol 101</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4">
              Initialize <span className="text-red-600">New Vault</span>
            </h1>
            <p className="text-zinc-500 text-sm md:text-base font-medium max-w-xl">
              Establish a high-performance repository for your local code management and version history.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-[#0d0d0d] border-[3px] border-red-600/50 text-red-500 px-8 py-5 mb-12 text-xs font-black uppercase tracking-widest italic animate-in slide-in-from-top-4 duration-300">
            Protocol_Error: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-20">
          {/* Section 01: General */}
          <div className="space-y-10">
            <div className="flex items-center gap-4">
              <div className="bg-red-600 text-white w-10 h-10 flex items-center justify-center border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black italic">01</div>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 italic">General_Specifications</h2>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-end gap-6">
              <div className="w-full md:w-auto">
                <label className="block text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Operator</label>
                <div className="bg-[#0d0d0d] border-[3px] border-black p-4 text-xs font-black text-white hover:border-red-600 transition-all flex items-center gap-4 cursor-default shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="w-6 h-6 bg-zinc-800 overflow-hidden border-2 border-black">
                    <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="tracking-widest">{userIdentifier}</span>
                  <ChevronDown className="w-4 h-4 text-zinc-700 ml-auto" />
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center h-14 text-3xl font-black text-zinc-800">/</div>
              <div className="flex-1">
                <label className="block text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Repository_Title *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="block w-full bg-[#0d0d0d] border-[3px] border-black p-4 text-xs font-black text-white focus:border-red-600 outline-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] placeholder:text-zinc-800 placeholder:italic"
                  value={name}
                  placeholder="E.G. QUANTUM-ENGINE"
                  onChange={(e) => {
                    const newName = e.target.value.replace(/[^a-zA-Z0-9-_]/g, '');
                    setName(newName);
                    if (newName.toLowerCase() === userIdentifier.toLowerCase()) {
                      setAddReadme(true);
                    }
                  }}
                />
              </div>
            </div>

            {name.toLowerCase() === userIdentifier.toLowerCase() && name.length > 0 && (
              <div className="bg-white border-[4px] border-black p-8 flex flex-col md:flex-row items-center gap-8 shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-red-600 flex items-center justify-center border-[3px] border-black shrink-0 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-white text-3xl font-black italic">!</span>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className="text-sm font-black text-black uppercase tracking-widest mb-2 italic">Special_Vault_Detected</h4>
                  <p className="text-[11px] text-zinc-600 font-bold leading-relaxed uppercase tracking-tighter">
                    Operator Identity Match: This repository will be featured on your profile as your primary identity hub.
                  </p>
                </div>
              </div>
            )}

            <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest italic">
              Strategy: Use short, memorable titles. Suggestion: <span className="text-red-900 hover:text-red-600 cursor-pointer transition-colors">CUDDLY-OCTO-BARNACLE</span>
            </p>

            <div>
              <label className="block text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Operational_Summary <span className="text-zinc-800 italic">(OPTIONAL)</span></label>
              <textarea
                className="block w-full bg-[#0d0d0d] border-[3px] border-black p-4 text-xs font-black text-white focus:border-red-600 outline-none transition-all resize-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] placeholder:text-zinc-800 placeholder:italic"
                rows={3}
                value={description}
                placeholder="DEFINE THE PURPOSE OF THIS VAULT..."
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Section 02: Protocols */}
          <div className="space-y-12 pt-20 border-t-4 border-zinc-900">
            <div className="flex items-center gap-4">
              <div className="bg-black text-white w-10 h-10 flex items-center justify-center border-[3px] border-zinc-800 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] font-black italic">02</div>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 italic">Security_Protocols</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div 
                onClick={() => setIsPrivate(false)}
                className={`p-8 border-[3px] cursor-pointer transition-all flex gap-6 relative group ${!isPrivate ? 'border-red-600 bg-red-600/5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'border-zinc-900 bg-[#0d0d0d] hover:border-zinc-700'}`}
              >
                <div className={`w-12 h-12 flex items-center justify-center border-2 ${!isPrivate ? 'bg-red-600 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-zinc-900 text-zinc-700 border-zinc-800'}`}>
                  <Book className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-xs uppercase tracking-widest">Public_Access</h4>
                    {!isPrivate && <Check className="w-5 h-5 text-red-600 stroke-[4px]" />}
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter leading-tight">Universal visibility. Selective contribution rights.</p>
                </div>
              </div>

              <div 
                onClick={() => setIsPrivate(true)}
                className={`p-8 border-[3px] cursor-pointer transition-all flex gap-6 relative group ${isPrivate ? 'border-red-600 bg-red-600/5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'border-zinc-900 bg-[#0d0d0d] hover:border-zinc-700'}`}
              >
                <div className={`w-12 h-12 flex items-center justify-center border-2 ${isPrivate ? 'bg-red-600 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-zinc-900 text-zinc-700 border-zinc-800'}`}>
                  <Shield className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-xs uppercase tracking-widest">Private_Vault</h4>
                    {isPrivate && <Check className="w-5 h-5 text-red-600 stroke-[4px]" />}
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter leading-tight">Restricted access. Authorized personnel only.</p>
                </div>
              </div>
            </div>

            <div className="border-[4px] border-black bg-[#0d0d0d] shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] overflow-hidden">
              <div className="bg-zinc-900 border-b-[3px] border-black px-6 py-4">
                <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">Initialization_Modules</h5>
              </div>
              
              <div className="divide-y-2 divide-black">
                <div className="p-6 flex items-center justify-between hover:bg-zinc-900/50 transition-colors group">
                  <div className="flex items-center gap-6">
                    <div className="p-3 bg-black border-2 border-zinc-800 text-zinc-700 group-hover:text-red-600 transition-colors"><FileText className="w-5 h-5" /></div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">Integrate README.MD</p>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase mt-1">Detailed operational manual for the project.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={addReadme} onChange={() => setAddReadme(!addReadme)} />
                    <div className="w-12 h-6 bg-zinc-900 border-2 border-black rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-black after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                <div className="p-6 flex items-center justify-between hover:bg-zinc-900/50 transition-colors group">
                  <div className="flex items-center gap-6">
                    <div className="p-3 bg-black border-2 border-zinc-800 text-zinc-700 group-hover:text-red-600 transition-colors"><FileText className="w-5 h-5" /></div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">Integrate .NVIGNORE</p>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase mt-1">Buffer exclusion protocols for version control.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={addNvignore} onChange={() => setAddNvignore(!addNvignore)} />
                    <div className="w-12 h-6 bg-zinc-900 border-2 border-black rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-black after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-zinc-900/50 transition-colors group">
                  <div className="flex items-center gap-6">
                    <div className="p-3 bg-black border-2 border-zinc-800 text-zinc-700 group-hover:text-red-600 transition-colors"><Shield className="w-5 h-5" /></div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">Sovereign_License</p>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase mt-1">Define the legal framework of this repository.</p>
                    </div>
                  </div>
                  <div className="relative">
                    <select 
                      className="appearance-none bg-black border-[3px] border-black text-xs font-black uppercase tracking-widest px-6 py-3 pr-12 outline-none focus:border-red-600 cursor-pointer min-w-[200px] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      value={license}
                      onChange={(e) => setLicense(e.target.value)}
                    >
                      {LICENSES.map(l => (
                        <option key={l.key} value={l.key}>{l.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-5 h-5 text-red-600 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Final Action */}
          <div className="pt-20 border-t-4 border-zinc-900 flex flex-col md:flex-row md:items-center gap-10">
            <button
              type="submit"
              disabled={!name || isSubmitting}
              className={`px-12 py-5 text-sm font-black uppercase tracking-[0.2em] italic transition-all relative overflow-hidden group ${(!name || isSubmitting) ? 'bg-zinc-900 text-zinc-700 border-[4px] border-black cursor-not-allowed' : 'bg-red-600 text-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'}`}
            >
              <div className="relative z-10 flex items-center gap-3">
                {isSubmitting ? 'Initializing_Vault...' : 'Authorize construction'}
                {!isSubmitting && <Plus className="w-5 h-5" />}
              </div>
            </button>
            <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest italic max-w-sm">
              Note: Clicking "Authorize Construction" initializes a new sovereign data vault under the NexusVault charter.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
