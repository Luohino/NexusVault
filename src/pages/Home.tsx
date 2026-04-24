import React from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Github, Book, Star, Plus, Twitter, History } from 'lucide-react';
import { HeroSection } from '../components/ui/hero-section';
import RuixenBentoCards from '../components/ui/ruixen-bento-cards';
import { Footer } from '../components/ui/modem-animated-footer';
import { LoadingScreen, DashboardSkeleton } from '../components/ui/loading-states';
import { format } from 'date-fns';

export const Home = () => {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [repos, setRepos] = React.useState<any[]>([]);
  const [activity, setActivity] = React.useState<any[]>([]);
  const [isReposLoading, setIsReposLoading] = React.useState(false);

  const userIdentifier = user?.username || user?.firstName || user?.id;

  React.useEffect(() => {
    if (userIdentifier) {
      const fetchRepos = async () => {
        setIsReposLoading(true);
        try {
          const token = await getToken();
          const headers: any = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          
          const res = await fetch(`/api/repos/${userIdentifier}?limit=10`, { headers });
          if (res.ok) {
            const data = await res.json();
            setRepos(data.repos || []);
          }

          const userRes = await fetch(`/api/users/${userIdentifier}`, { headers });
          if (userRes.ok) {
            const userData = await userRes.json();
            setActivity(userData.recentCommits || []);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsReposLoading(false);
        }
      };
      
      fetchRepos();
    }
  }, [userIdentifier, getToken]);

  const isLoading = !isLoaded || (user && isReposLoading);

  const socialLinks = [
    {
      icon: <Twitter className="w-5 h-5" />,
      href: "https://twitter.com",
      label: "Twitter",
    },
    {
      icon: <Github className="w-5 h-5" />,
      href: "https://github.com/luohino",
      label: "GitHub",
    },
  ];

  const navLinks = [
    { label: "Features", href: "/" },
    { label: "Documentation", href: "/" },
    { label: "Open Source", href: "/" },
    { label: "Privacy", href: "/" },
  ];

  if (isLoading) return <DashboardSkeleton />;

  return (
    <>
      {!user ? (
        <div className="bg-[#080808] w-full min-h-screen">
          <HeroSection />
          <RuixenBentoCards />
          <Footer
            brandName="NexusVault"
            brandDescription="The modern platform for hosting repositories and browsing code locally with enhanced performance."
            socialLinks={socialLinks}
            navLinks={navLinks}
            creatorName="Luohino"
            creatorUrl="https://github.com/luohino"
          />
        </div>
      ) : (
        <div className="min-h-screen bg-[#080808] text-white">
          <div className="max-w-[1400px] mx-auto w-full px-4 md:px-8 py-8 flex flex-col md:flex-row gap-8">
            {/* Left Sidebar */}
            <div className="w-full md:w-1/4 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-bold text-zinc-500">Top Repositories</h2>
                  <Link to="/new" className="neo-brutal-button !py-1 !px-3 !text-[8px]">
                    New
                  </Link>
                </div>
                
                <div className="space-y-1">
                  {!Array.isArray(repos) || repos.length === 0 ? (
                    <div className="p-4 border-2 border-dashed border-zinc-800 text-center">
                      <p className="text-[10px] uppercase font-bold text-zinc-600">No repositories found</p>
                    </div>
                  ) : (
                    repos.map(repo => (
                      <Link 
                        key={repo.id} 
                        to={`/${userIdentifier}/${repo.name}`}
                        className="sidebar-item"
                      >
                        <div className="w-5 h-5 bg-zinc-800 flex-shrink-0 flex items-center justify-center overflow-hidden border border-black">
                          {user.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold">{(userIdentifier || 'U')[0].toUpperCase()}</span>}
                        </div>
                        <span className="truncate font-medium hover:text-red-500 transition-colors">
                          {userIdentifier}/<span className="text-white font-bold">{repo.name}</span>
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900">
                <h2 className="text-xs font-bold text-zinc-500 mb-6">Recent Activity</h2>
                <div className="space-y-4">
                  {activity.length === 0 ? (
                    <p className="text-[10px] text-zinc-600 font-medium">No recent activity found.</p>
                  ) : (
                    activity.map((item: any) => (
                      <div key={item.id} className="flex gap-3 items-start group">
                        <div className="mt-1 w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <History className="w-3 h-3 text-red-600" />
                        </div>
                        <div className="space-y-1">
                          <Link 
                            to={`/${userIdentifier}/${item.repoName}/commit/${item.id}`}
                            className="text-[11px] font-bold text-zinc-300 hover:text-red-500 transition-colors line-clamp-1 leading-tight"
                          >
                            {item.message}
                          </Link>
                          <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">
                            <span>{item.repoName}</span>
                            <span>•</span>
                            <span>{format(new Date(item.timestamp), 'MMM d')}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Main Feed Area */}
            <div className="flex-1 space-y-6">
              <div className="neo-brutal-card p-10 md:p-16 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-3xl rounded-full -mr-16 -mt-16" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-white flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
                      <img src="/removedbg.png" alt="NexusVault Logo" className="w-8 h-8 object-contain" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight">Welcome to NexusVault</h2>
                      <p className="text-zinc-500 text-xs font-medium mt-1">Version 1.0 // Active Session</p>
                    </div>
                  </div>

                  <p className="text-zinc-400 text-sm leading-relaxed max-w-xl mb-10">
                    Your high-performance workspace for local code management and repository hosting. 
                    Everything is synced, secure, and styled for impact.
                  </p>

                  <div className="flex flex-wrap gap-4">
                    <Link to="/new" className="neo-brutal-button flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Create Repository
                    </Link>
                    <button className="px-6 py-3 border-2 border-zinc-800 text-xs font-bold hover:border-white hover:text-white transition-all">
                      Explore Community
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="border-2 border-zinc-900 p-6 hover:border-zinc-700 transition-colors">
                  <h3 className="text-sm font-bold mb-2">Pro Tips</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Use <code className="bg-zinc-800 px-1 text-red-500">Ctrl + K</code> to quickly search through all your local repositories and files.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
