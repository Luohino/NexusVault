import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Book, Users, Search as SearchIcon, Terminal, ExternalLink } from 'lucide-react';

export const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<{ users: any[], repositories: any[] }>({ users: [], repositories: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'repos' | 'users'>('repos');

  useEffect(() => {
    if (query) {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => setResults(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setResults({ users: [], repositories: [] });
    }
  }, [query]);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-7xl mx-auto w-full px-4 py-12 flex gap-12">
        {/* Sidebar */}
        <div className="w-1/4">
          <div className="sticky top-24 space-y-8">
            <div>
              <h3 className="text-xs text-zinc-400 font-bold mb-4 flex items-center">
                <span className="w-1.5 h-1.5 bg-red-600 mr-2"></span>
                Filter results
              </h3>
              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveTab('repos')}
                  className={`w-full text-left px-4 py-3 border-2 transition-all duration-200 flex justify-between items-center group ${
                    activeTab === 'repos' 
                      ? 'border-red-600 bg-red-600/5 text-white' 
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <Book className={`w-4 h-4 mr-3 ${activeTab === 'repos' ? 'text-red-500' : 'text-zinc-500'}`} />
                    <span className="text-sm font-semibold">Repositories</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                    activeTab === 'repos' ? 'border-red-500/30 text-red-400' : 'border-zinc-700 text-zinc-500'
                  }`}>
                    {results.repositories.length}
                  </span>
                </button>
                <button 
                  onClick={() => setActiveTab('users')}
                  className={`w-full text-left px-4 py-3 border-2 transition-all duration-200 flex justify-between items-center group ${
                    activeTab === 'users' 
                      ? 'border-red-600 bg-red-600/5 text-white' 
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <Users className={`w-4 h-4 mr-3 ${activeTab === 'users' ? 'text-red-500' : 'text-zinc-500'}`} />
                    <span className="text-sm font-semibold">Users</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                    activeTab === 'users' ? 'border-red-500/30 text-red-400' : 'border-zinc-700 text-zinc-500'
                  }`}>
                    {results.users.length}
                  </span>
                </button>
              </nav>
            </div>

            <div className="p-6 border-2 border-zinc-900 bg-zinc-900/20">
              <h4 className="text-xs font-bold text-zinc-400 mb-2">Pro Tip</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Use the <code className="text-red-500">owner:name</code> syntax to jump directly to a specific vault.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="mb-10 flex items-end justify-between border-b border-zinc-800 pb-8">
            <div>
              <h2 className="text-3xl font-black mb-2 flex items-center">
                Search Results
                <span className="ml-3 text-[10px] font-bold text-zinc-600 uppercase tracking-tight">
                  {loading ? 'indexing...' : 'active'}
                </span>
              </h2>
              <p className="text-zinc-500 text-sm font-medium">
                Found {activeTab === 'repos' ? results.repositories.length : results.users.length} matching entities for <span className="text-red-500 font-bold">"{query}"</span>
              </p>
            </div>
            <SearchIcon className="w-8 h-8 text-zinc-800" />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-zinc-900/30 border-2 border-zinc-900 animate-pulse"></div>
              ))}
            </div>
          ) : activeTab === 'repos' ? (
            results.repositories.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-800 py-24 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-zinc-900 flex items-center justify-center mb-6">
                  <Terminal className="w-8 h-8 text-zinc-700" />
                </div>
                <h3 className="text-xl font-bold text-zinc-400 mb-2">No repositories found</h3>
                <p className="text-zinc-600 text-sm max-w-sm">
                  We couldn't find any vaults matching your query. Try different keywords or check your spelling.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {results.repositories.map(repo => (
                  <Link 
                    key={repo.id} 
                    to={`/${repo.ownerUsername}/${repo.name}`}
                    className="group block border-2 border-zinc-900 bg-zinc-900/10 p-6 hover:border-red-600/50 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-zinc-800 flex items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                          <Book className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-white group-hover:text-red-500 transition-colors">
                            <span className="text-zinc-500 font-medium">{repo.ownerUsername} /</span> {repo.name}
                          </h4>
                          <div className="flex items-center mt-1 space-x-4 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                            <span className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-red-600 mr-1.5"></span>
                              {repo.isPrivate ? 'Private' : 'Public'}
                            </span>
                            <span>Updated recently</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
                      {repo.description || 'No description provided for this repository.'}
                    </p>
                  </Link>
                ))}
              </div>
            )
          ) : (
            results.users.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-800 py-24 flex flex-col items-center justify-center text-center">
                 <h3 className="text-xl font-bold text-zinc-400 mb-2">No users found</h3>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {results.users.map(user => (
                  <Link 
                    key={user.id} 
                    to={`/${user.username}`}
                    className="group flex items-center p-4 border-2 border-zinc-900 hover:border-red-600/50 bg-zinc-900/10 transition-all"
                  >
                    <div className="w-12 h-12 bg-zinc-800 mr-4 flex items-center justify-center text-zinc-500 group-hover:bg-red-600 group-hover:text-white transition-all overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold group-hover:text-red-500 transition-colors">{user.username}</h4>
                      <p className="text-[10px] text-zinc-500 font-bold mt-0.5">Contributor</p>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
