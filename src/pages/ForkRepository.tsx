import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { GitBranch, Book, Info, AlertCircle, ChevronDown, Check } from 'lucide-react';

export const ForkRepository = () => {
  const { username: sourceUsername, repoName: sourceRepoName } = useParams<{ username: string, repoName: string }>();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  const [repoName, setRepoName] = useState(sourceRepoName || '');
  const [description, setDescription] = useState('');
  const [isForking, setIsForking] = useState(false);
  const [sourceRepo, setSourceRepo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSourceRepo = async () => {
      try {
        const res = await fetch(`/api/repos/${sourceUsername}/${sourceRepoName}`);
        if (res.ok) {
          const data = await res.json();
          setSourceRepo(data);
          setDescription(data.description || '');
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (sourceUsername && sourceRepoName) fetchSourceRepo();
  }, [sourceUsername, sourceRepoName]);

  const handleFork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsForking(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch(`/api/repos/${sourceUsername}/${sourceRepoName}/fork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newName: repoName,
          description: description
        })
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/${data.username}/${data.newRepoName}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create fork');
      }
    } catch (err) {
      setError('An error occurred while creating the fork');
    } finally {
      setIsForking(false);
    }
  };

  if (!isLoaded || !sourceRepo) return (
    <div className="flex-1 bg-[#080808] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex-1 bg-[#080808] text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Create a new fork</h1>
            <p className="text-zinc-500 text-sm font-medium">A fork is a copy of a repository. Forking a repository allows you to freely experiment with changes without affecting the original project.</p>
          </div>
        </div>

        <form onSubmit={handleFork} className="space-y-8">
          {error && (
            <div className="bg-red-600/10 border-2 border-red-600 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span className="text-sm font-bold uppercase tracking-tight">{error}</span>
            </div>
          )}

          <div className="neo-brutal-card bg-[#0d0d0d] border-zinc-900 p-8 space-y-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">Owner</label>
                <div className="relative group">
                  <div className="w-full bg-black border-2 border-zinc-800 p-3 flex items-center justify-between cursor-not-allowed opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-zinc-800 overflow-hidden">
                        {user?.imageUrl && <img src={user.imageUrl} className="w-full h-full object-cover" />}
                      </div>
                      <span className="text-sm font-bold uppercase tracking-tight">{user?.username}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-zinc-600" />
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-zinc-600 uppercase">You are creating a fork in your personal account.</p>
                </div>
              </div>

              <div className="hidden md:flex items-end pb-12">
                <span className="text-2xl font-light text-zinc-800">/</span>
              </div>

              <div className="flex-[1.5] space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">Repository name <span className="text-red-600">*</span></label>
                <div className="relative">
                  <input 
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    required
                    className="w-full bg-black border-2 border-zinc-800 p-3 text-sm font-bold uppercase tracking-tight focus:border-red-600 outline-none transition-all"
                  />
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-green-500 uppercase">
                    <Check className="w-3 h-3" /> {repoName} is available
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">Description <span className="text-zinc-700 italic font-medium ml-2">(optional)</span></label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-black border-2 border-zinc-800 p-4 text-sm font-medium focus:border-red-600 outline-none transition-all resize-none"
                placeholder="What's this fork for?"
              />
              <p className="text-[10px] font-bold text-zinc-600 uppercase">By default, forks are named the same as their upstream repository.</p>
            </div>

            <div className="pt-4 border-t border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-3 text-zinc-500">
                <GitBranch className="w-5 h-5" />
                <div className="text-[10px] font-black uppercase tracking-tight">
                  Forking from <span className="text-red-600">{sourceUsername}/{sourceRepoName}</span>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isForking}
                className="bg-red-600 text-white border-2 border-black px-10 py-4 text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isForking ? (
                  <span className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    CREATING FORK...
                  </span>
                ) : 'CREATE FORK'}
              </button>
            </div>
          </div>

          <div className="p-6 border-2 border-dashed border-zinc-900 bg-zinc-900/10 flex items-start gap-4">
            <Info className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-zinc-500 uppercase leading-relaxed">
              Your fork will include the <span className="text-white">main</span> branch and all current files. 
              You can contribute changes back to the upstream repository by creating a pull request.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
