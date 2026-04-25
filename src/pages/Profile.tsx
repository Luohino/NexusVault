import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Users, MapPin, Link as LinkIcon, Calendar, Book, Star, Code, X, Check, Search as SearchIcon, Folder } from 'lucide-react';
import { MarkdownViewer } from '../components/ui/MarkdownViewer';
import { format } from 'date-fns';
import { useUser, useAuth } from '@clerk/clerk-react';

import { LoadingScreen } from '../components/ui/loading-states';
import { languageColors } from '../utils/languageColors';
import { SEO } from '../components/SEO';

export const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'overview';
  
  const [profileUser, setProfileUser] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [reposTotalCount, setReposTotalCount] = useState(0);
  const [socialList, setSocialList] = useState<any[]>([]);
  const [starredRepos, setStarredRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socialLoading, setSocialLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [savingPins, setSavingPins] = useState(false);
  const [selectedPins, setSelectedPins] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    location: '',
    pronouns: ''
  });
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [repoPage, setRepoPage] = useState(0);
  const { user } = useUser();
  const { getToken } = useAuth();
  
  // Refetch repos when search or page changes
  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const token = await getToken();
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const res = await fetch(`/api/repos/${username}?q=${repoSearchQuery}&limit=10&offset=${repoPage * 10}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setRepos(data.repos);
          setReposTotalCount(data.totalCount);
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    if (username) fetchRepos();
  }, [username, repoSearchQuery, repoPage, getToken]);

  const isOwner = user?.id === profileUser?.id;

  useEffect(() => {
    const fetchBaseProfile = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [userRes] = await Promise.all([
          fetch(`/api/users/${username}`, { headers })
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          setProfileUser(userData);
          setEditForm({
            displayName: userData.displayName || '',
            bio: userData.bio || '',
            location: userData.location || '',
            pronouns: userData.pronouns || ''
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchBaseProfile();
  }, [username, getToken]);

  useEffect(() => {
    const fetchTabData = async () => {
      const token = await getToken();
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      if (tab === 'followers' || tab === 'following') {
        setSocialLoading(true);
        try {
          const socialRes = await fetch(`/api/users/${username}/${tab}`, { headers });
          if (socialRes.ok) setSocialList(await socialRes.json());
        } catch (e) {
          console.error(e);
        } finally {
          setSocialLoading(false);
        }
      }

      if (tab === 'stars') {
        setSocialLoading(true);
        try {
          const starsRes = await fetch(`/api/users/${username}/stars`, { headers });
          if (starsRes.ok) setStarredRepos(await starsRes.json());
        } catch (e) {
          console.error(e);
        } finally {
          setSocialLoading(false);
        }
      }
    };

    fetchTabData();
  }, [username, tab, getToken]);

  const handleFollow = async () => {
    if (!user) return;
    
    try {
      const token = await getToken();
      const method = profileUser.isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(`/api/users/${username}/follow`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        setProfileUser({
          ...profileUser,
          isFollowing: !profileUser.isFollowing,
          followersCount: profileUser.isFollowing 
            ? Math.max(0, profileUser.followersCount - 1) 
            : profileUser.followersCount + 1
        });
      }
    } catch (err) {
      console.error('Follow operation failed:', err);
    }
  };

  const handleStar = async (repoName: string, isStarred: boolean) => {
    if (!user) return;
    
    // Optimistic Update
    const originalRepos = [...repos];
    setRepos(repos.map(r => r.name === repoName ? { 
      ...r, 
      isStarred: !isStarred, 
      starCount: isStarred ? Math.max(0, r.starCount - 1) : r.starCount + 1 
    } : r));

    try {
      const token = await getToken();
      const method = isStarred ? 'DELETE' : 'POST';
      const res = await fetch(`/api/repos/${username}/${repoName}/star`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        setRepos(originalRepos); // Rollback
      }
    } catch (err) {
      console.error('Star operation failed:', err);
      setRepos(originalRepos); // Rollback
    }
  };

  const handleUpdatePins = async (repoIds: string[]) => {
    if (!user) return;
    setSavingPins(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/users/${username}/pins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ repoIds })
      });
      
      if (res.ok) {
        // Refresh repos
        const reposRes = await fetch(`/api/repos/${username}`);
        const reposData = await reposRes.json();
        setRepos(reposData.repos || []);
        setReposTotalCount(reposData.totalCount || 0);
        setIsPinModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to update pins:', err);
    } finally {
      setSavingPins(false);
    }
  };

  useEffect(() => {
    if (isPinModalOpen) {
      setSelectedPins((repos || []).filter(r => r.isPinned).map(r => r.id));
    }
  }, [isPinModalOpen, repos]);

  if (loading) return <LoadingScreen />;
  if (!profileUser) return <div className="p-20 text-center text-xl font-bold text-zinc-800 bg-[#080808] min-h-screen">User Not Found.</div>;

  return (
    <>
      <SEO 
        title={`${username} (${profileUser.displayName || username})`}
        description={profileUser.bio || `View ${username}'s repositories and contributions on NexusVault.`}
        username={username}
      />
      <div className="bg-[#080808] min-h-screen text-white">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-8 py-6 sm:py-8 md:py-10 flex flex-col md:flex-row gap-6 md:gap-10">
        {/* User Info Sidebar */}
        <div className="w-full md:w-80 space-y-5 md:sticky md:top-6 self-start">
          <div className="relative group">
            <div className="w-full max-w-[260px] md:max-w-none mx-auto md:mx-0 aspect-square bg-[#0d0d0d] border-2 border-zinc-800 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[10px_10px_0px_0px_rgba(220,38,38,0.3)] transition-all overflow-hidden rounded-full md:rounded-none">
              {profileUser.avatarUrl ? (
                <img src={profileUser.avatarUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl font-black text-zinc-900 bg-zinc-800/20">
                  {username ? username[0].toUpperCase() : 'U'}
                </div>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Name</label>
                <input 
                  type="text" 
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({...editForm, displayName: e.target.value})}
                  className="w-full bg-[#0d0d0d] border border-zinc-800 p-2 text-xs font-bold text-white focus:border-red-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Bio</label>
                <textarea 
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  className="w-full bg-[#0d0d0d] border border-zinc-800 p-2 text-xs font-medium text-zinc-300 focus:border-red-600 outline-none h-24 resize-none"
                  placeholder="Add a bio"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Pronouns</label>
                <input 
                  type="text" 
                  value={editForm.pronouns}
                  onChange={(e) => setEditForm({...editForm, pronouns: e.target.value})}
                  className="w-full bg-[#0d0d0d] border border-zinc-800 p-2 text-xs font-bold text-white focus:border-red-600 outline-none"
                  placeholder="e.g. he/him"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1">Location</label>
                <input 
                  type="text" 
                  value={editForm.location}
                  onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                  className="w-full bg-[#0d0d0d] border border-zinc-800 p-2 text-xs font-bold text-white focus:border-red-600 outline-none"
                  placeholder="Location"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button 
                  onClick={async () => {
                    try {
                      const token = await getToken();
                      const res = await fetch(`/api/users/${username}`, {
                        method: 'PATCH',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(editForm)
                      });
                      if (res.ok) {
                        setProfileUser({...profileUser, ...editForm});
                        setIsEditing(false);
                      }
                    } catch (e) {
                      console.error('Update failed:', e);
                    }
                  }}
                  className="flex-1 bg-red-600 border-2 border-red-700 py-2 text-[10px] font-black text-white hover:bg-red-500 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  Save
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-zinc-900 border-2 border-zinc-800 py-2 text-[10px] font-black text-zinc-400 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tighter text-white">{profileUser.displayName || profileUser.username}</h1>
                <p className="text-zinc-500 font-bold text-sm flex items-center gap-2">
                  @{username}
                  {profileUser.pronouns && <span className="text-[10px] text-zinc-700 bg-zinc-900 px-1.5 py-0.5 border border-zinc-800">{profileUser.pronouns}</span>}
                </p>
              </div>

              {isOwner ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-zinc-900 border-2 border-zinc-800 py-2 text-xs font-black text-white hover:bg-zinc-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  Edit profile
                </button>
              ) : (
                <button 
                  onClick={handleFollow}
                  className={`w-full py-2 text-xs font-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 ${
                    profileUser.isFollowing 
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-red-500' 
                      : 'bg-white border-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {profileUser.isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
              
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <Users className="w-4 h-4 text-zinc-600" />
                <span className="hover:text-red-500 cursor-pointer transition-colors"><strong className="text-white font-bold">{profileUser.followersCount || 0}</strong> followers</span>
                <span className="text-zinc-800 px-0.5">·</span>
                <span className="hover:text-red-500 cursor-pointer transition-colors"><strong className="text-white font-bold">{profileUser.followingCount || 0}</strong> following</span>
              </div>
              
              <p className="text-zinc-400 text-[13px] leading-relaxed font-medium">{profileUser.bio || 'Building the future of decentralized source control.'}</p>
            </div>
          )}
          
          <div className="space-y-3 pt-4 border-t border-zinc-900">
            {profileUser.location && (
              <div className="flex items-center gap-3 text-zinc-500 text-xs font-bold">
                <MapPin className="w-4 h-4 text-red-600" /> {profileUser.location}
              </div>
            )}
            <div className="flex items-center gap-3 text-zinc-500 text-xs font-bold">
              <Calendar className="w-4 h-4 text-red-600" /> Joined {profileUser.joinedAt ? format(new Date(profileUser.joinedAt), 'MMMM yyyy') : 'April 2026'}
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="flex-1 space-y-8">
          <nav className="flex gap-1 border-b border-zinc-900 relative z-20 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'overview', icon: <Book className="w-4 h-4" />, label: 'Overview' },
              { id: 'repositories', icon: <Folder className="w-4 h-4" />, label: 'Repositories', count: reposTotalCount },
              { id: 'followers', icon: <Users className="w-4 h-4" />, label: 'Followers', count: profileUser.followersCount || 0 },
              { id: 'following', icon: <Users className="w-4 h-4" />, label: 'Following', count: profileUser.followingCount || 0 },
              { id: 'stars', icon: <Star className="w-4 h-4" />, label: 'Stars', count: profileUser.starsCount || 0 },
            ].map((t) => (
              <Link
                key={t.id}
                to={`/${username}?tab=${t.id}`}
                className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-3 text-[11px] font-bold tracking-tight transition-all relative border-b-2 whitespace-nowrap ${
                  tab === t.id 
                    ? 'text-white border-red-600 bg-red-600/5' 
                    : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-900/40'
                }`}
              >
                {t.icon}
                <span className="hidden sm:inline capitalize">{t.label}</span>
                {t.count !== undefined && (
                  <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-[9px] font-black ml-1">
                    {t.count}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tab === 'overview' && (
              <>
                {profileUser.profileReadme && (
                  <div className="col-span-full mb-10">
                    <div className="neo-brutal-card !p-0 overflow-hidden">
                      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400">
                           <Book className="w-4 h-4 text-red-600" /> {username} / README.md
                         </div>
                      </div>
                      <div className="p-6 md:p-8">
                        <MarkdownViewer content={profileUser.profileReadme} />
                      </div>
                    </div>
                  </div>
                )}
                 <div className="col-span-full">
                   {(() => {
                     const reposArray = Array.isArray(repos) ? repos : [];
                     const pinnedRepos = reposArray.filter(r => r.isPinned);
                     const displayRepos = pinnedRepos.length > 0 ? pinnedRepos : [...reposArray].sort((a, b) => (b.starCount || 0) - (a.starCount || 0)).slice(0, 4);
                     const isActualPins = pinnedRepos.length > 0;

                     return (
                       <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                           <h3 className="text-sm font-bold text-zinc-400">
                             {isActualPins ? 'Pinned Repositories' : 'Popular Repositories'}
                           </h3>
                           {user && user.username === username && (
                             <button 
                               onClick={() => setIsPinModalOpen(true)}
                               className="text-[10px] font-bold text-zinc-600 tracking-widest cursor-pointer hover:text-red-500 transition-colors"
                             >
                               {isActualPins ? 'Customize your pins' : 'Pin repositories'}
                             </button>
                           )}
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                           {displayRepos.length === 0 ? (
                             <div className="col-span-full p-16 border-2 border-zinc-900 bg-[#0d0d0d] text-center text-zinc-600 text-sm font-bold">
                               No items to display.
                             </div>
                           ) : (
                             displayRepos.map(repo => (
                               <div key={repo.id} className="neo-brutal-card !p-0 overflow-hidden group">
                                 <div className="p-6">
                                   <div className="flex items-center justify-between mb-3">
                                     <Link to={`/${username}/${repo.name}`} className="font-black text-xl text-white group-hover:text-red-500 transition-colors">
                                       {repo.name}
                                     </Link>
                                     <span className="text-[10px] font-bold border border-zinc-800 px-2.5 py-1 text-zinc-500 tracking-tighter">
                                       {repo.isPrivate ? 'Private' : 'Public'}
                                     </span>
                                   </div>
                                   <p className="text-sm text-zinc-400 line-clamp-2 mb-8 font-medium leading-relaxed">
                                     {repo.description || 'A masterpiece in the making. Exploring new boundaries.'}
                                   </p>
                                   <div className="flex items-center gap-5 text-xs font-bold text-zinc-500">
                                     {repo.language && (
                                       <span className="flex items-center gap-2">
                                         <span 
                                           className="w-3 h-3 rounded-full" 
                                           style={{ 
                                             backgroundColor: languageColors[repo.language] || '#888',
                                             boxShadow: `0 0 8px ${languageColors[repo.language] || '#888'}44`
                                           }} 
                                         /> 
                                         {repo.language}
                                       </span>
                                     )}
                                     <span className="flex items-center gap-2">
                                       <Star className="w-4 h-4 text-red-600" /> {repo.starCount || 0}
                                     </span>
                                   </div>
                                 </div>
                               </div>
                             ))
                           )}
                         </div>
                       </>
                     );
                   })()}
                 </div>

                <div className="col-span-full pt-6">
                  <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-zinc-400">
                          {profileUser.contributions?.reduce((acc: number, c: any) => acc + c.count, 0) || 0} contributions in the last year
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 tracking-tighter cursor-pointer hover:text-red-500">
                          Contribution settings
                        </div>
                      </div>
                      
                      <div className="neo-brutal-card !p-4 sm:!p-8 bg-[#0d0d0d] overflow-x-auto relative scrollbar-hide">
                        <div className="min-w-[800px] lg:min-w-0 w-full">
                          {/* Month Labels */}
                          <div className="grid grid-cols-[30px_repeat(52,minmax(0,1fr))] gap-1.5 mb-2 text-[9px] font-black text-zinc-600">
                            <div /> {/* Empty space for day labels */}
                            {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((month, i) => (
                              <div key={i} className="col-span-[4]">{month}</div>
                            ))}
                          </div>

                          <div className="flex gap-3">
                            {/* Day Labels */}
                            <div className="flex flex-col justify-between py-1 text-[9px] font-black text-zinc-700 h-[100px]">
                              <span>Mon</span>
                              <span>Wed</span>
                              <span>Fri</span>
                            </div>

                            {/* The Grid */}
                            <div className="flex-1 grid grid-flow-col grid-rows-7 gap-1.5 h-[100px]">
                              {Array.from({ length: 364 }).map((_, i) => {
                                const date = new Date();
                                date.setDate(date.getDate() - (363 - i));
                                const dateStr = date.toISOString().split('T')[0];
                                const contribution = profileUser.contributions?.find((c: any) => c.date === dateStr);
                                const count = contribution ? contribution.count : 0;
                                
                                return (
                                  <div key={i} className={`aspect-square border border-black/10 transition-all duration-300 hover:scale-125 hover:z-10 cursor-pointer ${
                                    count > 10 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 
                                    count > 5 ? 'bg-red-700' : 
                                    count > 2 ? 'bg-red-800' : 
                                    count > 0 ? 'bg-red-950' : 'bg-zinc-800/50'
                                  }`} title={`${count} contributions on ${dateStr}`} />
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-6 text-[10px] font-bold text-zinc-600">
                            <span className="hover:text-red-500 cursor-pointer transition-colors">Learn how we count contributions</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px]">Less</span>
                              <div className="flex gap-1">
                                <div className="w-3 h-3 bg-zinc-800/50 border border-black/10" />
                                <div className="w-3 h-3 bg-red-950 border border-black/10" />
                                <div className="w-3 h-3 bg-red-800 border border-black/10" />
                                <div className="w-3 h-3 bg-red-700 border border-black/10" />
                                <div className="w-3 h-3 bg-red-500 border border-black/10" />
                              </div>
                              <span className="text-[9px]">More</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Year Selector */}
                    <div className="w-full lg:w-32 flex lg:flex-col gap-2 mt-10">
                      {(() => {
                        const currentYear = new Date().getFullYear();
                        const joinYear = profileUser.joinedAt ? new Date(profileUser.joinedAt).getFullYear() : currentYear;
                        const years = Array.from({ length: currentYear - joinYear + 1 }, (_, i) => (currentYear - i).toString());
                        return years.map(year => (
                          <button key={year} className={`px-4 py-2 text-[11px] font-black text-center transition-all ${
                            year === currentYear.toString()
                              ? 'bg-red-600 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' 
                              : 'bg-zinc-900 text-zinc-500 hover:text-white'
                          }`}>
                            {year}
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </>
            )}
            {tab === 'repositories' && (
              <div className="col-span-full space-y-6">
                <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-2">
                  <div className="relative flex-1 w-full">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input 
                      type="text" 
                      placeholder="Find a repository..."
                      className="w-full bg-[#0d0d0d] border-2 border-zinc-900 px-12 py-3 text-sm text-white focus:border-red-600 outline-none transition-all placeholder:text-zinc-700 font-bold"
                      value={repoSearchQuery}
                      onChange={(e) => {
                        setRepoSearchQuery(e.target.value);
                        setRepoPage(0);
                      }}
                    />
                  </div>
                  <div className="flex w-full md:w-auto gap-2">
                    <button className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors">Type</button>
                    <button className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors">Language</button>
                  </div>
                </div>

                <div className="space-y-1">
                  {repos.length === 0 ? (
                    <div className="p-24 text-center border-2 border-dashed border-zinc-900 text-zinc-600 text-[10px] font-bold uppercase tracking-widest bg-[#0d0d0d]/30">
                      Zero Repositories Found matching your criteria.
                    </div>
                  ) : (
                    <>
                      {repos.map(repo => (
                        <div key={repo.id} className="p-4 sm:p-6 md:p-8 border-b border-zinc-900 hover:bg-red-600/5 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group relative overflow-hidden">
                          <div className="relative z-10 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <Link to={`/${username}/${repo.name}`} className="text-xl font-black text-white group-hover:text-red-500 transition-colors">
                                {repo.name}
                              </Link>
                              <span className="text-[10px] font-bold border border-zinc-800 px-2 py-0.5 text-zinc-500 bg-black">
                                {repo.isPrivate ? 'Private' : 'Public'}
                              </span>
                            </div>
                            <p className="text-[13px] font-medium text-zinc-500 mb-6 max-w-2xl leading-relaxed">
                              {repo.description || 'No description provided. This project is a masterpiece in progress.'}
                            </p>
                            <div className="flex items-center gap-6 text-[11px] font-bold text-zinc-500">
                              {repo.language && (
                                <span className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: languageColors[repo.language] || '#888' }} />
                                  {repo.language}
                                </span>
                              )}
                              {repo.starCount > 0 && (
                                <span className="flex items-center gap-1.5 text-zinc-400">
                                  <Star className="w-3.5 h-3.5 fill-red-600 text-red-600" /> {repo.starCount}
                                </span>
                              )}
                              <span>Updated on {format(new Date(repo.updatedAt), 'MMM d')}</span>
                            </div>
                          </div>
                          <div className="relative z-10 flex flex-col items-start sm:items-end gap-3">
                            <button 
                              onClick={() => handleStar(repo.name, repo.isStarred)}
                              className={`border-2 p-2.5 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none ${
                                repo.isStarred 
                                  ? 'bg-red-600 border-red-700 text-white' 
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-red-500'
                              }`}
                            >
                              <Star className={`w-5 h-5 ${repo.isStarred ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Pagination */}
                      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-8 sm:py-12">
                        <button 
                          disabled={repoPage === 0}
                          onClick={() => setRepoPage(prev => Math.max(0, prev - 1))}
                          className="bg-black border-2 border-zinc-800 px-8 py-3 text-[10px] font-black text-white uppercase tracking-widest hover:border-red-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                        >
                          Previous
                        </button>
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-zinc-900 px-4 py-2 border border-zinc-800">Page {repoPage + 1}</span>
                        <button 
                          disabled={reposTotalCount <= (repoPage + 1) * 10}
                          onClick={() => setRepoPage(prev => prev + 1)}
                          className="bg-black border-2 border-zinc-800 px-8 py-3 text-[10px] font-black text-white uppercase tracking-widest hover:border-red-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}






            {(tab === 'followers' || tab === 'following') && (
              <div className={`col-span-full space-y-1 transition-opacity duration-200 ${socialLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                {socialList.length === 0 && !socialLoading ? (
                  <div className="p-24 text-center border-2 border-dashed border-zinc-900 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                    No {tab} found.
                  </div>
                ) : (
                  socialList.map(item => (
                    <div key={item.id} className="p-4 sm:p-6 border-b border-zinc-900 hover:bg-zinc-900/20 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-start gap-4 min-w-0">
                        <Link to={`/${item.username}`} className="w-12 h-12 bg-zinc-800 border-2 border-zinc-900 overflow-hidden shrink-0 group-hover:border-red-600 transition-colors">
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-black text-zinc-700">
                              {item.username[0].toUpperCase()}
                            </div>
                          )}
                        </Link>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Link to={`/${item.username}`} className="text-sm font-black text-white hover:text-red-500 transition-colors">
                              {item.displayName || item.username}
                            </Link>
                            <span className="text-[11px] font-bold text-zinc-600">@{item.username}</span>
                          </div>
                          <p className="text-[12px] text-zinc-500 max-w-lg line-clamp-1">{item.bio || 'Building the future of decentralized source control.'}</p>
                        </div>
                      </div>
                      <Link 
                        to={`/${item.username}`}
                        className="bg-zinc-900 border-2 border-zinc-800 px-4 py-1.5 text-[10px] font-black text-white hover:bg-zinc-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      >
                        View Profile
                      </Link>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'stars' && (
              <div className={`col-span-full space-y-4 transition-opacity duration-200 ${socialLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                {starredRepos.length === 0 && !socialLoading ? (
                  <div className="p-24 text-center border-2 border-dashed border-zinc-900 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                    No starred repositories found.
                  </div>
                ) : (
                  starredRepos.map(repo => (
                    <div key={repo.id} className="p-4 sm:p-6 border-b border-zinc-900 hover:bg-zinc-900/20 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link to={`/${repo.ownerUsername}`} className="text-sm font-medium text-zinc-500 hover:text-red-500 transition-colors">
                            {repo.ownerUsername}
                          </Link>
                          <span className="text-zinc-800">/</span>
                          <Link to={`/${repo.ownerUsername}/${repo.name}`} className="text-lg font-black text-white hover:text-red-500 transition-colors">
                            {repo.name}
                          </Link>
                          <span className="text-[8px] font-bold border border-zinc-800 px-2 py-0.5 text-zinc-500 ml-2">
                            {repo.isPrivate ? 'Private' : 'Public'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-4">{repo.description || 'No description provided.'}</p>
                        <div className="flex items-center gap-6 text-[10px] font-bold text-zinc-600">
                          {repo.language && (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: languageColors[repo.language] || '#888' }} />
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-red-600 fill-current" /> {repo.starCount}</span>
                          <span>Updated on {format(new Date(repo.updatedAt), 'MMM d')}</span>
                        </div>
                      </div>
                      <Link 
                        to={`/${repo.ownerUsername}/${repo.name}`}
                        className="bg-zinc-900 border-2 border-zinc-800 px-4 py-1.5 text-[10px] font-black text-white hover:bg-zinc-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      >
                        View Repo
                      </Link>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pin Selection Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="neo-brutal-card w-full max-w-xl max-h-[85vh] !p-0 overflow-hidden bg-[#0a0a0a] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-zinc-900 bg-zinc-900/50 shrink-0">
              <h2 className="text-lg font-black text-white">Edit pinned items</h2>
              <button onClick={() => setIsPinModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <p className="text-sm text-zinc-400 mb-6">Select up to six public repositories you'd like to show to anyone.</p>
              
              <div className="relative mb-6">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input 
                  type="text" 
                  placeholder="Filter repositories"
                  className="w-full bg-black border-2 border-zinc-900 px-12 py-3 text-sm text-white focus:border-red-600 outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                {(repos || [])
                  .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(repo => {
                    const isSelected = selectedPins.includes(repo.id);
                    return (
                      <div 
                        key={repo.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedPins(selectedPins.filter(id => id !== repo.id));
                          } else if (selectedPins.length < 6) {
                            setSelectedPins([...selectedPins, repo.id]);
                          }
                        }}
                        className={`flex items-center p-4 border-2 transition-all cursor-pointer group ${
                          isSelected 
                            ? 'border-red-600 bg-red-600/5' 
                            : 'border-zinc-900 bg-zinc-900/10 hover:border-zinc-800'
                        }`}
                      >
                        <div className={`w-5 h-5 border-2 mr-4 flex items-center justify-center transition-all ${
                          isSelected ? 'border-red-600 bg-red-600' : 'border-zinc-800 group-hover:border-zinc-700'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <Book className={`w-4 h-4 mr-3 ${isSelected ? 'text-red-500' : 'text-zinc-500'}`} />
                        <span className={`text-sm font-bold flex-1 ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                          {repo.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
                          <Star className="w-3.5 h-3.5" /> {repo.starCount || 0}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-zinc-900/30 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                {6 - selectedPins.length} remaining
              </span>
              <div className="flex w-full sm:w-auto gap-3 sm:gap-4">
                <button 
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-black text-zinc-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleUpdatePins(selectedPins)}
                  disabled={savingPins}
                  className="neo-brutal-button flex-1 sm:flex-none !px-8 !py-2.5 disabled:opacity-50"
                >
                  {savingPins ? 'Saving...' : 'Save pins'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
