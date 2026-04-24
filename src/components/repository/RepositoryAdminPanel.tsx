import { useEffect, useState } from 'react';
import { GitBranch, Lock, Globe, Trash, UserPlus } from 'lucide-react';

export const RepositoryAdminPanel = ({ username, repoName, branches, settings, repo, getToken, onRefresh, onRepoUpdated }: any) => {
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [inviteUser, setInviteUser] = useState('');
  const [role, setRole] = useState('write');
  const [renameBranch, setRenameBranch] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [previewUser, setPreviewUser] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'missing'>('idle');
  const [inviteError, setInviteError] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [isChangingVisibility, setIsChangingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState('');

  const authedFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  };

  const loadCollaborators = async () => {
    const res = await authedFetch(`/api/repos/${username}/${repoName}/collaborators`);
    if (res.ok) setCollaborators(await res.json());
  };

  useEffect(() => {
    loadCollaborators();
  }, [username, repoName]);

  useEffect(() => {
    const candidate = inviteUser.trim();
    setInviteError('');
    setPreviewUser(null);
    if (selectedUser?.username?.toLowerCase() === candidate.toLowerCase()) {
      setLookupState('idle');
      return;
    }
    setSelectedUser(null);
    if (candidate.length < 2) {
      setLookupState('idle');
      return;
    }

    setLookupState('loading');
    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(candidate)}`);
      if (res.ok) {
        const foundUser = await res.json();
        setPreviewUser(foundUser);
        setLookupState('found');
      } else {
        setLookupState('missing');
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [inviteUser, selectedUser]);

  const saveDefaultBranch = async (defaultBranch: string) => {
    await authedFetch(`/api/repos/${username}/${repoName}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({ ...settings, defaultBranch }),
    });
    onRefresh?.();
  };

  const handleRename = async () => {
    if (!renameBranch || !renameTo) return;
    const res = await authedFetch(`/api/repos/${username}/${repoName}/branches/${encodeURIComponent(renameBranch)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: renameTo }),
    });
    if (res.ok) {
      setRenameBranch('');
      setRenameTo('');
      onRefresh?.();
    }
  };

  const handleDeleteBranch = async (name: string) => {
    if (!confirm(`Delete branch ${name}?`)) return;
    const res = await authedFetch(`/api/repos/${username}/${repoName}/branches/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (res.ok) onRefresh?.();
  };

  const handleInvite = async () => {
    const targetUsername = selectedUser?.username;
    if (!targetUsername) return;
    setInviteError('');
    if (collaborators.some((collaborator: any) => collaborator.username?.toLowerCase() === targetUsername.toLowerCase())) {
      setInviteError(`${targetUsername} is already a collaborator`);
      return;
    }
    try {
      setIsInviting(true);
      const res = await authedFetch(`/api/repos/${username}/${repoName}/collaborators`, {
        method: 'POST',
        body: JSON.stringify({ username: targetUsername, role }),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteUser('');
        setPreviewUser(null);
        setSelectedUser(null);
        setLookupState('idle');
        if (data.email && !data.email.sent) {
          setInviteError('Invite created in-app, but email was skipped. Configure RESEND_API_KEY and EMAIL_FROM in .env to send email.');
        }
        loadCollaborators();
      } else {
        const data = await res.json().catch(() => ({}));
        setInviteError(data.error || 'Could not add collaborator');
      }
    } catch {
      setInviteError('Could not add collaborator');
    } finally {
      setIsInviting(false);
    }
  };

  const removeCollaborator = async (id: string) => {
    const collaborator = collaborators.find((entry: any) => entry.id === id);
    if (!collaborator) return;
    if (!confirm(`Remove ${collaborator.username} from collaborators?`)) return;

    setRemoveError('');
    setRemovingCollaboratorId(id);
    setCollaborators(prev => prev.filter((entry: any) => entry.id !== id));

    try {
      const res = await authedFetch(`/api/repos/${username}/${repoName}/collaborators/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRemoveError(data.error || 'Could not remove collaborator');
        setCollaborators(prev => [...prev, collaborator]);
      }
    } catch {
      setRemoveError('Could not remove collaborator');
      setCollaborators(prev => [...prev, collaborator]);
    } finally {
      setRemovingCollaboratorId('');
    }
  };

  const handleVisibilityChange = async (nextIsPrivate: boolean) => {
    if (!repo || Boolean(repo.isPrivate) === nextIsPrivate) return;
    try {
      setIsChangingVisibility(true);
      setVisibilityError('');
      const res = await authedFetch(`/api/repos/${username}/${repoName}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPrivate: nextIsPrivate }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setVisibilityError(data.error || 'Could not update repository visibility');
        return;
      }
      const updatedRepo = await res.json();
      onRepoUpdated?.(updatedRepo);
    } catch {
      setVisibilityError('Could not update repository visibility');
    } finally {
      setIsChangingVisibility(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-4 border-black bg-white text-black p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
        <div className="flex items-center gap-3 mb-6">
          {repo?.isPrivate ? <Lock className="w-5 h-5 text-red-600" /> : <Globe className="w-5 h-5 text-red-600" />}
          <h3 className="text-lg font-black">Repository visibility</h3>
        </div>
        <p className="text-sm font-bold text-zinc-700 mb-5">
          Control whether this repository is visible to everyone or only to you and accepted collaborators.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            onClick={() => handleVisibilityChange(false)}
            disabled={isChangingVisibility || !repo?.isPrivate}
            className={`border-2 border-black p-4 text-left transition-all ${
              repo?.isPrivate
                ? 'bg-white hover:bg-zinc-50 disabled:opacity-60'
                : 'bg-red-600 text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4" />
              <span className="text-sm font-black">Public</span>
            </div>
            <p className={`text-xs font-bold ${repo?.isPrivate ? 'text-zinc-600' : 'text-white/90'}`}>
              Anyone can view this repository.
            </p>
          </button>
          <button
            onClick={() => handleVisibilityChange(true)}
            disabled={isChangingVisibility || Boolean(repo?.isPrivate)}
            className={`border-2 border-black p-4 text-left transition-all ${
              repo?.isPrivate
                ? 'bg-red-600 text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white hover:bg-zinc-50 disabled:opacity-60'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-black">Private</span>
            </div>
            <p className={`text-xs font-bold ${repo?.isPrivate ? 'text-white/90' : 'text-zinc-600'}`}>
              Only you and collaborators can view it.
            </p>
          </button>
        </div>
        <p className="mt-4 text-xs font-black text-zinc-500">
          {isChangingVisibility ? 'Updating visibility...' : `Current visibility: ${repo?.isPrivate ? 'Private' : 'Public'}`}
        </p>
        {visibilityError && <p className="mt-2 text-xs font-black text-red-600">{visibilityError}</p>}
      </div>

      <div className="border-4 border-black bg-white text-black p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
        <div className="flex items-center gap-3 mb-6">
          <GitBranch className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-black">Branch management</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-bold">
            Default branch
            <select value={settings?.defaultBranch || 'main'} onChange={(e) => saveDefaultBranch(e.target.value)} className="mt-2 w-full border-2 border-black px-3 py-2 bg-white">
              {branches.map((branch: any) => <option key={branch.id} value={branch.name}>{branch.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">
            Rename branch
            <select value={renameBranch} onChange={(e) => setRenameBranch(e.target.value)} className="mt-2 w-full border-2 border-black px-3 py-2 bg-white">
              <option value="">Choose branch</option>
              {branches.filter((branch: any) => branch.name !== (settings?.defaultBranch || 'main')).map((branch: any) => <option key={branch.id} value={branch.name}>{branch.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">
            New name
            <div className="mt-2 flex gap-2">
              <input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} className="min-w-0 flex-1 border-2 border-black px-3 py-2" />
              <button onClick={handleRename} className="bg-black text-white px-4 py-2 text-xs font-black">Rename</button>
            </div>
          </label>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {branches.filter((branch: any) => branch.name !== (settings?.defaultBranch || 'main')).map((branch: any) => (
            <div key={branch.id} className="flex items-center justify-between border-2 border-black p-3">
              <span className="text-sm font-black">{branch.name}</span>
              <button onClick={() => handleDeleteBranch(branch.name)} className="text-red-600 hover:text-black"><Trash className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-4 border-black bg-white text-black p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
        <div className="flex items-center gap-3 mb-6">
          <UserPlus className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-black">Collaborators</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <div className="relative">
            <input value={inviteUser} onChange={(e) => setInviteUser(e.target.value)} placeholder="username" className="w-full border-2 border-black px-3 py-2 font-bold" />
            {lookupState !== 'idle' && !selectedUser && (
              <div className="absolute left-0 right-0 top-full mt-2 z-20 border-[3px] border-black bg-white shadow-[7px_7px_0px_0px_rgba(220,38,38,1)]">
                {lookupState === 'loading' && (
                  <div className="p-4 text-xs font-black text-zinc-500">Checking user...</div>
                )}
                {lookupState === 'missing' && (
                  <div className="p-4 text-xs font-black text-red-600">No NexusVault user found for "{inviteUser.trim()}".</div>
                )}
                {lookupState === 'found' && previewUser && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedUser(previewUser);
                      setInviteUser(previewUser.username);
                      setLookupState('idle');
                    }}
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-red-50 transition-colors"
                  >
                    {previewUser.avatarUrl ? (
                      <img src={previewUser.avatarUrl} alt={previewUser.username} className="w-12 h-12 border-[3px] border-black object-cover shadow-[3px_3px_0px_0px_rgba(220,38,38,1)]" />
                    ) : (
                      <div className="w-12 h-12 bg-red-600 border-[3px] border-black flex items-center justify-center text-white font-black">
                        {previewUser.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-black text-black truncate">{previewUser.displayName || previewUser.username}</p>
                      <p className="text-xs font-bold text-zinc-500 truncate">@{previewUser.username}</p>
                      <p className="text-[10px] font-black text-red-600 mt-1">Tap to select this account.</p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="border-2 border-black px-3 py-2 bg-white font-bold">
            <option value="read">Read</option>
            <option value="write">Write</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={!selectedUser || isInviting}
            className="bg-red-600 text-white border-2 border-black px-5 py-2 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInviting ? 'Inviting...' : 'Invite'}
          </button>
        </div>
        {selectedUser && (
          <div className="mt-4 border-[3px] border-black bg-red-50 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {selectedUser.avatarUrl ? (
                <img src={selectedUser.avatarUrl} alt={selectedUser.username} className="w-10 h-10 border-2 border-black object-cover" />
              ) : (
                <div className="w-10 h-10 bg-red-600 text-white border-2 border-black flex items-center justify-center text-xs font-black">
                  {selectedUser.username?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-black truncate">{selectedUser.displayName || selectedUser.username}</p>
                <p className="text-xs font-bold text-zinc-500 truncate">@{selectedUser.username} selected</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedUser(null);
                setInviteUser('');
              }}
              className="text-xs font-black text-red-600 hover:text-black"
            >
              Change
            </button>
          </div>
        )}
        {inviteError && <p className="mt-3 text-xs font-black text-red-600">{inviteError}</p>}
        {removeError && <p className="mt-3 text-xs font-black text-red-600">{removeError}</p>}
        <div className="mt-6 space-y-3">
          {collaborators.map((collaborator: any) => (
            <div key={collaborator.id} className="flex items-center justify-between border-2 border-black p-3">
              <div className="flex items-center gap-3 min-w-0">
                {collaborator.avatarUrl ? (
                  <img src={collaborator.avatarUrl} alt={collaborator.username} className="w-9 h-9 border-2 border-black object-cover" />
                ) : (
                  <div className="w-9 h-9 bg-black text-white border-2 border-black flex items-center justify-center text-xs font-black">
                    {collaborator.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-black truncate">{collaborator.username} <span className="text-zinc-500">/ {collaborator.role}</span></span>
              </div>
              <button
                onClick={() => removeCollaborator(collaborator.id)}
                disabled={removingCollaboratorId === collaborator.id}
                className="text-red-600 hover:text-black disabled:opacity-40 disabled:cursor-wait"
                title={removingCollaboratorId === collaborator.id ? 'Removing collaborator' : 'Remove collaborator'}
              >
                {removingCollaboratorId === collaborator.id ? (
                  <span className="text-[10px] font-black">Removing...</span>
                ) : (
                  <Trash className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
          {collaborators.length === 0 && <p className="text-xs font-bold text-zinc-500">No collaborators invited yet.</p>}
        </div>
      </div>
      <div className="border-4 border-black bg-red-50 text-black p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
        <div className="flex items-center gap-3 mb-6">
          <Trash className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-black text-red-600 uppercase tracking-tight">Danger Zone</h3>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-6 border-[3px] border-black p-6 bg-white">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black mb-1">Delete this repository</h4>
            <p className="text-xs font-bold text-zinc-600">
              Once you delete a repository, there is no going back. Please be certain.
            </p>
          </div>
          <button
            onClick={async () => {
              if (confirm(`ARE YOU ABSOLUTELY SURE? This will permanently delete the repository "${repoName}" and all of its history, issues, and wiki pages. Type the name of the repository to confirm:`)) {
                const confirmation = prompt(`Please type "${repoName}" to confirm deletion:`);
                if (confirmation === repoName) {
                  const res = await authedFetch(`/api/repos/${username}/${repoName}`, { method: 'DELETE' });
                  if (res.ok) {
                    window.location.href = `/${username}`;
                  } else {
                    alert('Could not delete repository. Ensure you are the owner.');
                  }
                }
              }
            }}
            className="bg-red-600 hover:bg-black text-white border-[3px] border-black px-6 py-3 text-xs font-black uppercase tracking-widest transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            Delete this repository
          </button>
        </div>
      </div>
    </div>
  );
};
