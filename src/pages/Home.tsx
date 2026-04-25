import React from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Github, Book, Star, Plus, Twitter, History, Linkedin, Youtube, Instagram, X, Folder } from 'lucide-react';
import { HeroSection } from '../components/ui/hero-section';
import RuixenBentoCards from '../components/ui/ruixen-bento-cards';
import { Footer } from '../components/ui/modem-animated-footer';
import { LoadingScreen, DashboardSkeleton } from '../components/ui/loading-states';
import { ProtocolHub } from '../components/ui/protocol-hub';
import { format } from 'date-fns';
import { SEO } from '../components/SEO';

export const Home = () => {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [repos, setRepos] = React.useState<any[]>([]);
  const [activity, setActivity] = React.useState<any[]>([]);
  const [isReposLoading, setIsReposLoading] = React.useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = React.useState(false);

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
    { icon: <Twitter className="w-5 h-5" />, href: "https://x.com/Luohinoo", label: "X (Twitter)" },
    { icon: <Github className="w-5 h-5" />, href: "https://github.com/Luohino/", label: "GitHub" },
    { icon: <Linkedin className="w-5 h-5" />, href: "https://www.linkedin.com/in/luohino-o-43620931b", label: "LinkedIn" },
    { icon: <Youtube className="w-5 h-5" />, href: "https://youtube.com/@luohino", label: "YouTube" },
    { icon: <Instagram className="w-5 h-5" />, href: "https://www.instagram.com/luohinoo", label: "Instagram" },
  ];

  const navLinks = [
    { label: "Documentation", href: "/vault" },
    { label: "Open Source", href: "/vault" },
    { label: "Privacy", href: "/docs/PRIVACY.md" },
    { label: "Sovereign Charter", href: "/docs/SOVEREIGN_IDENTITY_CHARTER.md" },
  ];

  if (isLoading) return <DashboardSkeleton />;

  return (
    <>
      <SEO />
      {!user ? (
        <div className="bg-[#080808] w-full min-h-screen">
          <HeroSection />
          <RuixenBentoCards />
          <ProtocolHub />
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
        <div className="min-h-screen bg-[#080808] text-white font-['Inter']">
          <div className="max-w-[1400px] mx-auto w-full px-4 md:px-8 py-6 md:py-8 flex flex-col md:flex-row gap-8 relative">
            
            {/* Mobile Dashboard Toggle */}
            <button 
              onClick={() => setIsMobilePanelOpen(true)}
              className="md:hidden flex items-center justify-between p-4 bg-[#0d0d0d] border-2 border-black shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] mb-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white flex items-center justify-center border-2 border-black">
                  <Book className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Command Panel</span>
              </div>
              <Plus className="w-4 h-4 text-zinc-500" />
            </button>

            {/* Mobile Panel Overlay */}
            {isMobilePanelOpen && (
              <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm md:hidden">
                <div className="absolute right-0 top-0 h-full w-[85%] bg-[#080808] border-l-4 border-black p-6 animate-in slide-in-from-right duration-300">
                  <button 
                    onClick={() => setIsMobilePanelOpen(false)}
                    className="absolute top-6 right-6 text-red-600 p-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  
                  <div className="mt-12 space-y-10 overflow-y-auto h-[calc(100vh-100px)] scrollbar-hide">
                    {/* Repos Section */}
                    <div>
                      <h2 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-6">Top Repositories</h2>
                      <div className="space-y-2">
                        {repos.map(repo => (
                          <Link 
                            key={repo.id} 
                            to={`/${userIdentifier}/${repo.name}`}
                            className="flex items-center gap-3 p-3 bg-[#0d0d0d] border-2 border-black hover:border-red-600 transition-all"
                            onClick={() => setIsMobilePanelOpen(false)}
                          >
                            <Folder className="w-4 h-4 text-zinc-500" />
                            <span className="text-xs font-bold truncate">{repo.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Activity Section */}
                    <div>
                      <h2 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-6">Recent Activity</h2>
                      <div className="space-y-4">
                        {activity.map((item: any) => (
                          <div key={item.id} className="flex gap-4 p-3 border-b-2 border-zinc-900">
                            <History className="w-4 h-4 text-zinc-700 shrink-0 mt-1" />
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-white truncate">{item.message}</p>
                              <p className="text-[9px] font-black text-zinc-600 uppercase mt-1">{item.repoName}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Left Sidebar */}
            <div className="hidden md:block w-1/4 space-y-8">
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
            <div className="flex-1 space-y-8">
              <div className="bg-white text-black p-8 md:p-20 relative overflow-hidden group border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]">
                {/* Institutional Patterns */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-1000 -mr-20 -mt-20"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-6 mb-10">
                    <div className="w-16 h-16 bg-black flex items-center justify-center border-4 border-black shadow-[6px_6px_0px_0px_rgba(220,38,38,1)]">
                      <img src={user.imageUrl} alt="User Profile" className="w-12 h-12 object-cover" />
                    </div>
                    <div>
                      <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
                        Welcome, <span className="text-red-600">{userIdentifier}</span>
                      </h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mt-2">Active Sovereign Session // NexusVault v1.0</p>
                    </div>
                  </div>

                  <p className="font-['Inter'] text-base md:text-lg font-medium text-zinc-500 leading-relaxed max-w-2xl mb-12">
                    Your high-performance workspace for local code management and repository hosting. 
                    Radical transparency, secure protocols, and institutional-grade engineering.
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
