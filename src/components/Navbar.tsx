import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
import { Search, Plus, Bell, LogOut, User, Folder, Book } from 'lucide-react';

export const Navbar = () => {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  React.useEffect(() => {
    const syncUser = async () => {
      if (isSignedIn && user) {
        try {
          const token = await getToken();
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              id: user.id,
              username: user.username || user.firstName || 'user',
              email: user.primaryEmailAddress?.emailAddress || `${user.id}@clerk.local`,
              avatarUrl: user.imageUrl
            })
          });
        } catch (error) {
          console.error('Failed to sync user:', error);
        }
      }
    };

    syncUser();
  }, [isSignedIn, user, getToken]);

  const loadNotifications = async () => {
    if (!isSignedIn) return;
    const token = await getToken();
    const res = await fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setNotifications(await res.json());
  };

  React.useEffect(() => {
    loadNotifications();
  }, [isSignedIn, user?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const unreadCount = notifications.filter(notification => !notification.isRead).length;

  const acceptNotificationInvite = async (notification: any) => {
    const token = await getToken();
    const res = await fetch(`/api/notifications/${notification.id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await loadNotifications();
      if (notification.href) navigate(notification.href);
      setIsNotificationsOpen(false);
    }
  };

  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);

  if (!isSignedIn || !user) return null;

  return (
    <>
    <nav className="bg-[#080808] text-white py-4 px-4 md:px-8 flex items-center justify-between border-b-2 border-black sticky top-0 z-50">
      <div className="flex items-center gap-8 flex-1">
        <Link to="/" className="group">
          <div className="text-xl font-bold text-white group-hover:text-red-600 transition-colors border-2 border-black bg-[#0d0d0d] px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]">
            NV
          </div>
        </Link>

        <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-sm relative">
          <input
            type="text"
            placeholder="Jump to..."
            className="w-full bg-[#0d0d0d] border border-zinc-800 py-1.5 px-4 pl-10 text-[10px] font-bold text-white placeholder-zinc-600 focus:border-red-600 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="w-4 h-4 absolute left-3.5 top-2 text-zinc-600" />
          <div className="absolute right-3 top-2 border border-zinc-800 px-1 text-[8px] text-zinc-700 font-bold">
            /
          </div>
        </form>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={() => { setIsMobileSearchOpen(!isMobileSearchOpen); setIsDropdownOpen(false); setIsNotificationsOpen(false); }}
          className="md:hidden text-zinc-400 hover:text-red-600 transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
        <Link to="/new" className="text-zinc-400 hover:text-red-600 transition-colors">
          <Plus className="w-5 h-5" />
        </Link>
        <div className="relative">
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsDropdownOpen(false);
              loadNotifications();
            }}
            className="text-zinc-400 hover:text-red-600 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-red-600 border border-black text-[8px] text-white font-black flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="fixed md:absolute right-0 left-0 md:left-auto mt-6 md:w-96 mx-4 md:mx-0 bg-white border-[3px] border-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] text-black z-[100] overflow-hidden">
              <div className="bg-red-600 text-white border-b-[3px] border-black px-5 py-4">
                <h3 className="text-sm font-black uppercase italic">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y-[3px] divide-black">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`w-full text-left p-4 hover:bg-red-50 transition-colors ${notification.isRead ? 'bg-white' : 'bg-red-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      {notification.actorAvatarUrl ? (
                        <img src={notification.actorAvatarUrl} alt={notification.actorUsername || ''} className="w-10 h-10 border-2 border-black object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-black text-white border-2 border-black flex items-center justify-center text-xs font-black">
                          {(notification.actorUsername || 'N')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-black text-black">{notification.title}</p>
                        {notification.body && <p className="text-[11px] font-bold text-zinc-600 mt-1">{notification.body}</p>}
                        {notification.type === 'repository_invite' && notification.invitationStatus === 'pending' ? (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => acceptNotificationInvite(notification)}
                              className="bg-red-600 text-white border-2 border-black px-3 py-1.5 text-[10px] font-black"
                            >
                              Accept invite
                            </button>
                            <button
                              onClick={async () => {
                                const token = await getToken();
                                await fetch(`/api/notifications/${notification.id}/read`, {
                                  method: 'PATCH',
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                await loadNotifications();
                              }}
                              className="bg-white text-black border-2 border-black px-3 py-1.5 text-[10px] font-black"
                            >
                              Later
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              const token = await getToken();
                              await fetch(`/api/notifications/${notification.id}/read`, {
                                method: 'PATCH',
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              setIsNotificationsOpen(false);
                              if (notification.href) navigate(notification.href);
                            }}
                            className="mt-3 text-[10px] font-black text-red-600 hover:text-black"
                          >
                            Open
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="p-8 text-center text-xs font-black text-zinc-500">No notifications yet</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="w-7 h-7 bg-zinc-800 border border-black overflow-hidden shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]">
              <img src={user.imageUrl} alt={user.username || ''} className="w-full h-full object-cover" />
            </div>
            <span className="text-[8px] text-zinc-600 font-bold">▼</span>
          </button>

          {isDropdownOpen && (
            <div className="fixed md:absolute right-0 left-0 md:left-auto mt-6 md:w-80 mx-4 md:mx-0 bg-white border-[3px] border-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] text-black z-[100] overflow-hidden animate-in slide-in-from-top-4 duration-300">
              {/* Bold Header Zone */}
              <div className="bg-red-600 p-6 border-b-[3px] border-black relative overflow-hidden group">
                {/* Diagonal Stripe Accent */}
                <div className="absolute top-0 right-0 w-32 h-full bg-black/10 -skew-x-[45deg] translate-x-16"></div>

                <div className="flex items-center gap-5 relative z-10">
                  <div className="relative">
                    <div className="absolute inset-0 bg-black translate-x-1.5 translate-y-1.5"></div>
                    <div className="relative w-14 h-14 border-[3px] border-black bg-white overflow-hidden -rotate-2 group-hover:rotate-0 transition-transform duration-500">
                      <img src={user?.imageUrl} alt={user?.username || ''} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-black italic -skew-x-12 text-white leading-tight uppercase">{user?.username || 'User'}</span>
                    <span className="text-[9px] font-black bg-black text-white px-2 py-0.5 mt-1 self-start tracking-tighter">LEVEL_01_OPERATOR</span>
                  </div>
                </div>
              </div>

              {/* Account Info Bar */}
              <div className="bg-black text-white px-6 py-2 border-b-[3px] border-black flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-red-500">Authorized</span>
                <span className="text-[10px] font-bold truncate max-w-[180px]">{user?.primaryEmailAddress?.emailAddress}</span>
              </div>

              {/* Navigation Section */}
              <div className="p-2 bg-white">
                <Link
                  to={`/${user?.username || user?.id}`}
                  className="flex items-center gap-4 px-4 py-4 text-xs font-black hover:bg-red-50 hover:text-red-600 transition-all border-b-2 border-transparent hover:border-black group"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-black text-white group-hover:bg-red-600 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="flex-1">View profile</span>
                  <span className="text-[10px] font-black text-zinc-300 group-hover:text-black">/01</span>
                </Link>

                <Link
                  to={`/${user?.username || user?.id}?tab=repositories`}
                  className="flex items-center gap-4 px-4 py-4 text-xs font-black hover:bg-red-50 hover:text-red-600 transition-all border-b-2 border-transparent hover:border-black group"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-black text-white group-hover:bg-red-600 transition-colors">
                    <Folder className="w-4 h-4" />
                  </div>
                  <span className="flex-1">Manage Repos</span>
                  <span className="text-[10px] font-black text-zinc-300 group-hover:text-black">/02</span>
                </Link>

                <Link
                  to="/vault"
                  className="flex items-center gap-4 px-4 py-4 text-xs font-black hover:bg-red-50 hover:text-red-600 transition-all border-b-2 border-transparent hover:border-black group"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-black text-white group-hover:bg-red-600 transition-colors">
                    <Book className="w-4 h-4" />
                  </div>
                  <span className="flex-1">Protocol Vault</span>
                  <span className="text-[10px] font-black text-zinc-300 group-hover:text-black">/03</span>
                </Link>

                <div className="mt-4 border-t-[3px] border-black">
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-between w-full p-5 bg-black text-white hover:bg-red-600 transition-all group overflow-hidden relative"
                  >
                    {/* Animated BG text */}
                    <span className="absolute left-0 bottom-0 text-[40px] font-black text-white/5 leading-none translate-y-4 pointer-events-none group-hover:text-white/10 transition-colors">LOGOUT</span>

                    <div className="flex flex-col text-left relative z-10">
                      <span className="text-xs font-black uppercase tracking-tighter group-hover:translate-x-1 transition-transform">Terminate access</span>
                      <span className="text-[8px] font-bold text-zinc-500 group-hover:text-red-100 transition-colors">End active session now</span>
                    </div>
                    <div className="w-10 h-10 flex items-center justify-center bg-white text-black border-2 border-black group-hover:translate-x-1 transition-transform relative z-10">
                      <LogOut className="w-5 h-5" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>

    {/* Mobile Search Bar */}
    {isMobileSearchOpen && (
      <div className="md:hidden bg-[#080808] border-b-2 border-black px-4 py-3 sticky top-[57px] z-40">
        <form onSubmit={(e) => { handleSearch(e); setIsMobileSearchOpen(false); }} className="relative">
          <input
            type="text"
            placeholder="Search users, repos..."
            className="w-full bg-[#0d0d0d] border-2 border-zinc-800 py-2.5 px-4 pl-10 text-xs font-bold text-white placeholder-zinc-600 focus:border-red-600 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-600" />
        </form>
      </div>
    )}
    </>
  );
};
