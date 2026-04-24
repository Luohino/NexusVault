import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Book, Shield, FileText, ChevronDown, Check } from 'lucide-react';
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
    <div className="bg-[#080808] min-h-screen text-white pb-24 font-sans selection:bg-red-500/30">
      <div className="max-w-[800px] mx-auto w-full px-4 md:px-8 pt-16">
        <div className="border-b border-zinc-900 pb-10 mb-12">
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Create a new repository</h1>
          <p className="text-zinc-500 text-[14px]">
            Repositories contain a project's files and version history.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/10 border border-red-900/30 text-red-500 px-6 py-4 mb-10 text-sm italic rounded-md">
            Error: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          <div className="space-y-8">
            <div className="flex items-center gap-3 text-zinc-400 mb-6">
              <div className="w-6 h-6 rounded-full border border-zinc-800 flex items-center justify-center text-[11px] font-medium">1</div>
              <span className="text-sm font-semibold">General</span>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-end gap-3">
              <div className="w-full md:w-auto">
                <label className="block text-sm font-semibold text-zinc-300 mb-2 ml-0.5">Owner *</label>
                <div className="bg-[#0d0d0d] border border-zinc-800 rounded-md px-3 py-1.5 text-sm font-medium text-white hover:border-zinc-700 transition-colors flex items-center gap-2 cursor-default">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                    <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-zinc-200">{userIdentifier}</span>
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                </div>
              </div>
              <span className="hidden md:block text-2xl font-light text-zinc-700 mb-1">/</span>
              <div className="flex-1 w-full">
                <label className="block text-sm font-semibold text-zinc-300 mb-2 ml-0.5">Repository name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="block w-full bg-[#0d0d0d] border border-zinc-800 rounded-md px-4 py-1.5 text-sm font-medium text-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all shadow-sm"
                  value={name}
                  placeholder="e.g. quantum-engine"
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
              <div className="bg-[#0a0a0a] border-2 border-zinc-900 p-6 flex items-center gap-6 animate-in fade-in duration-200 shadow-xl">
                <div className="w-12 h-12 bg-red-600/10 border-2 border-red-600 flex items-center justify-center shrink-0">
                  <span className="text-red-600 text-xl font-bold">!</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h4 className="text-[14px] font-bold text-white tracking-tight">
                      Special Vault
                    </h4>
                    <span className="text-[9px] font-bold text-zinc-500 border border-zinc-800 px-1.5 py-0.5 font-mono uppercase tracking-tighter">
                      IDENTIFIER_MATCH
                    </span>
                  </div>
                  <p className="text-[12px] text-zinc-400 leading-relaxed max-w-xl">
                    You've discovered a special vault. <span className="text-red-500 font-bold">{userIdentifier}/{name}</span> can be used to initialize your public identity. 
                    The README.md file in this repository will be featured on your profile page.
                  </p>
                </div>
              </div>
            )}

            <p className="text-[12px] text-zinc-500 ml-0.5">
              Great repository names are short and memorable. How about <span className="text-red-500 font-medium cursor-pointer">cuddly-octo-barnacle</span>?
            </p>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2 ml-0.5">Description <span className="text-zinc-600 font-normal ml-1">(optional)</span></label>
              <textarea
                className="block w-full bg-[#0d0d0d] border border-zinc-800 rounded-md px-4 py-2 text-sm font-medium text-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all resize-none shadow-sm"
                rows={2}
                value={description}
                placeholder="What is this repository about?"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-10 pt-10 border-t border-zinc-900">
            <div className="flex items-center gap-3 text-zinc-400 mb-6">
              <div className="w-6 h-6 rounded-full border border-zinc-800 flex items-center justify-center text-[11px] font-medium">2</div>
              <span className="text-sm font-semibold">Configuration</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => setIsPrivate(false)}
                className={`p-4 border rounded-lg cursor-pointer transition-all flex gap-4 ${!isPrivate ? 'border-red-600 bg-red-600/5 shadow-[0px_0px_10px_0px_rgba(220,38,38,0.1)]' : 'border-zinc-800 bg-[#0d0d0d] hover:bg-zinc-900/50'}`}
              >
                <div className={`p-2 rounded-md ${!isPrivate ? 'bg-red-600/10 text-red-500' : 'bg-zinc-900 text-zinc-500'}`}>
                  <Book className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm">Public</h4>
                    {!isPrivate && <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white stroke-[4px]" /></div>}
                  </div>
                  <p className="text-[12px] text-zinc-500 leading-snug">Anyone on the internet can see this repository. You choose who can commit.</p>
                </div>
              </div>

              <div 
                onClick={() => setIsPrivate(true)}
                className={`p-4 border rounded-lg cursor-pointer transition-all flex gap-4 ${isPrivate ? 'border-red-600 bg-red-600/5 shadow-[0px_0px_10px_0px_rgba(220,38,38,0.1)]' : 'border-zinc-800 bg-[#0d0d0d] hover:bg-zinc-900/50'}`}
              >
                <div className={`p-2 rounded-md ${isPrivate ? 'bg-red-600/10 text-red-500' : 'bg-zinc-900 text-zinc-500'}`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm">Private</h4>
                    {isPrivate && <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white stroke-[4px]" /></div>}
                  </div>
                  <p className="text-[12px] text-zinc-500 leading-snug">You choose who can see and commit to this repository.</p>
                </div>
              </div>
            </div>

            <div className="space-y-0 border border-zinc-800 rounded-lg overflow-hidden bg-[#0d0d0d]">
              <div className="p-4 bg-zinc-900/30 border-b border-zinc-800">
                <h5 className="text-[13px] font-semibold text-zinc-300">Initialize this repository with:</h5>
              </div>
              
              <div className="p-4 flex items-center justify-between hover:bg-zinc-900/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-zinc-900 rounded-md text-zinc-500"><FileText className="w-4 h-4" /></div>
                  <div>
                    <p className="text-sm font-semibold">Add a README file</p>
                    <p className="text-[12px] text-zinc-500">This is where you can write a long description for your project.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={addReadme} onChange={() => setAddReadme(!addReadme)} />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="p-4 border-t border-zinc-800 flex items-center justify-between hover:bg-zinc-900/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-zinc-900 rounded-md text-zinc-500"><FileText className="w-4 h-4" /></div>
                  <div>
                    <p className="text-sm font-semibold">Add .nvignore file</p>
                    <p className="text-[12px] text-zinc-500">Files and folders to exclude from tracking.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={addNvignore} onChange={() => setAddNvignore(!addNvignore)} />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="p-4 border-t border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-900/30 transition-colors">
                <div>
                  <p className="text-sm font-semibold">Choose a license</p>
                  <p className="text-[12px] text-zinc-500">A license tells others what they can and can't do with your code.</p>
                </div>
                <div className="relative">
                  <select 
                    className="appearance-none bg-zinc-900 border border-zinc-800 rounded-md text-sm font-medium px-4 py-1.5 pr-10 outline-none focus:border-red-600 cursor-pointer min-w-[140px] transition-colors"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                  >
                    {LICENSES.map(l => (
                      <option key={l.key} value={l.key}>{l.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-zinc-900 flex flex-col md:flex-row md:items-center gap-6">
            <button
              type="submit"
              disabled={!name || isSubmitting}
              className={`px-8 py-2 rounded-md text-sm font-semibold transition-all ${(!name || isSubmitting) ? 'bg-red-600/30 text-white/50 cursor-not-allowed border border-red-900/30' : 'bg-red-600 hover:bg-red-700 text-white border border-red-700 shadow-sm active:scale-[0.98]'}`}
            >
              {isSubmitting ? 'Creating...' : 'Create repository'}
            </button>
            <p className="text-[12px] text-zinc-500">
              By clicking "Create repository", you acknowledge the terms of the vault.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
