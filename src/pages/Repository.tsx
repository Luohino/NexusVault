import React, { useEffect, useState } from 'react';
import { useParams, Link, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Book, Star, GitFork, Code, CircleDot, GitPullRequest, Settings, File as FileIcon, Folder as FolderIcon, GitBranch, ChevronDown, Tag, Activity, Eye, Pencil, Trash, Copy, Terminal, Monitor, User, UserPlus, Plus, Upload, History, Globe, TagIcon, Package, Download, FileArchive, X, BarChart3, Shield, Hash, BookOpen } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { MarkdownViewer } from '../components/ui/MarkdownViewer';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';

const IssueDetail = ({ username, repoName, issues, user, repo, onRefresh }: any) => {
  const location = useLocation();
  const { getToken } = useAuth();
  const issueId = location.pathname.split('/').pop()!;
  const [comments, setComments] = useState<any[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  const issue = issues.find((i: any) => i.id === issueId);

  const loadComments = async () => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/repos/${username}/${repoName}/issues/${issueId}/comments`, { headers });
      if (res.ok) {
        setComments(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (issueId) loadComments();
  }, [username, repoName, issueId, getToken]);

  if (!issue) return (
    <div className="p-12 text-center border-[3px] border-black bg-[#0d0d0d] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white font-black uppercase italic">
      Anomaly_Not_Detected: Issue record severed.
    </div>
  );
  
  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-8">
      <div className="border-b-[4px] border-black pb-8 mb-10">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-6">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
            {issue.title} <span className="text-zinc-500 font-light ml-4">#{issue.id.substring(0, 4)}</span>
          </h2>
          {user && user.id === repo.ownerId && (
            <button 
              disabled={isUpdatingStatus}
              onClick={async () => {
                setIsUpdatingStatus(true);
                try {
                  const newStatus = issue.status === 'open' ? 'closed' : 'open';
                  const token = await getToken();
                  const res = await fetch(`/api/repos/${username}/${repoName}/issues/${issueId}`, {
                    method: 'PATCH',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: newStatus })
                  });
                  if (res.ok) {
                    onRefresh?.();
                  }
                } finally {
                  setIsUpdatingStatus(false);
                }
              }}
              className="bg-black text-white border-[3px] border-black px-6 py-2 text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
            >
              {isUpdatingStatus ? 'Processing...' : (issue.status === 'open' ? 'Terminate Issue' : 'Restore Issue')}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <span className={`px-4 py-1.5 border-[3px] border-black text-white text-[10px] font-black uppercase tracking-widest flex items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${issue.status === 'open' ? 'bg-green-600' : 'bg-purple-600'}`}>
            <CircleDot className="w-4 h-4 mr-2" /> {issue.status === 'open' ? 'Active' : 'Archived'}
          </span>
          <span className="text-xs font-bold text-zinc-400">
            <span className="text-white uppercase font-black tracking-tight">{issue.creatorUsername}</span> deployed this anomaly on {format(new Date(issue.createdAt), 'MMM d, yyyy')}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">
        <div className="space-y-10">
          {/* Main Issue Content */}
          <div className="border-[3px] border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-zinc-100 border-b-[3px] border-black px-6 py-3 flex items-center justify-between">
              <span className="text-[10px] font-black text-black uppercase tracking-widest">{issue.creatorUsername} commented</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Original Payload</span>
            </div>
            <div className="p-8">
              <MarkdownViewer content={issue.description || '*No description provided.*'} theme="light" />
            </div>
          </div>

          {/* Comments */}
          {comments.map(comment => (
            <div key={comment.id} className="border-[3px] border-black bg-white shadow-[10px_10px_0px_0px_rgba(220,38,38,1)] overflow-hidden md:ml-8 relative">
               <div className="hidden md:flex absolute -left-12 top-6 w-8 h-8 bg-black border-[3px] border-black items-center justify-center text-[10px] font-black text-white shadow-[3px_3px_0px_0px_rgba(220,38,38,1)]">
                {comment.authorUsername[0].toUpperCase()}
              </div>
              <div className="bg-zinc-50 border-b-[3px] border-black px-6 py-3 flex items-center justify-between">
                <span className="text-[10px] font-black text-black uppercase tracking-widest">{comment.authorUsername}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">{format(new Date(comment.createdAt), 'MMM d, yyyy')}</span>
              </div>
              <div className="p-6">
                <MarkdownViewer content={comment.content} theme="light" />
              </div>
            </div>
          ))}

          {/* New Comment Form */}
          {user && (
            <div className="border-[3px] border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden md:ml-8 relative">
              <div className="hidden md:flex absolute -left-12 top-6 w-8 h-8 bg-red-600 border-[3px] border-black items-center justify-center text-[10px] font-black text-white shadow-[3px_3px_0px_0px_rgba(220,38,38,1)]">
                {(user.username || user.firstName || 'U')[0].toUpperCase()}
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmittingComment(true);
                try {
                  const form = e.target as HTMLFormElement;
                  const textarea = form.elements.namedItem('content') as HTMLTextAreaElement;
                  const content = textarea.value;
                  
                  const token = await getToken();
                  const res = await fetch(`/api/repos/${username}/${repoName}/issues/${issueId}/comments`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ content })
                  });
                  
                  if (res.ok) {
                    textarea.value = '';
                    await loadComments();
                  }
                } finally {
                  setIsSubmittingComment(false);
                }
              }}>
                <div className="bg-zinc-100 border-b-[3px] border-black px-6 py-3">
                  <span className="text-[10px] font-black text-black uppercase tracking-widest">Transmit Response</span>
                </div>
                <div className="p-4">
                  <textarea 
                    name="content"
                    placeholder="Provide intel..." 
                    rows={6}
                    required
                    disabled={isSubmittingComment}
                    className="w-full px-4 py-3 border-[3px] border-black bg-zinc-50 focus:bg-white focus:border-red-600 outline-none font-mono text-xs text-black disabled:opacity-50"
                  ></textarea>
                </div>
                <div className="bg-zinc-50 p-4 border-t-[3px] border-black flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSubmittingComment}
                    className="bg-red-600 hover:bg-black text-white border-[3px] border-black px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
                  >
                    {isSubmittingComment ? 'Transmitting...' : 'Sync Comment'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="border-[3px] border-black bg-[#0d0d0d] p-6 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Assigned Personnel</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-dashed border-zinc-800 flex items-center justify-center">
                <User className="w-4 h-4 text-zinc-800" />
              </div>
              <span className="text-xs font-bold text-zinc-600 italic">No operators assigned</span>
            </div>
          </div>

          <div className="border-[3px] border-black bg-[#0d0d0d] p-6 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Labels</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-500">UNLABELED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const NewIssue = ({ username, repoName, user, getToken }: any) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/repos/${username}/${repoName}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, description })
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/${username}/${repoName}/issues/${data.issueId}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        <div className="w-12 h-12 bg-zinc-900 border-2 border-black overflow-hidden flex-shrink-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <img src={user?.imageUrl} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <form onSubmit={handleSubmit} className="border-[3px] border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="bg-zinc-100 border-b-[3px] border-black px-3 sm:px-6 py-1 flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`text-[10px] font-black uppercase tracking-widest px-6 py-4 transition-all ${
                  activeTab === 'write' ? 'text-black border-b-2 border-red-600 bg-white' : 'text-zinc-400 hover:text-black'
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`text-[10px] font-black uppercase tracking-widest px-6 py-4 transition-all ${
                  activeTab === 'preview' ? 'text-black border-b-2 border-red-600 bg-white' : 'text-zinc-400 hover:text-black'
                }`}
              >
                Preview
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-6 bg-transparent">
              {activeTab === 'write' ? (
                <>
                  <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-[3px] border-black font-black uppercase tracking-tight focus:outline-none focus:ring-0 focus:border-red-600 text-sm text-black placeholder-zinc-400 bg-zinc-50"
                  />
                  <textarea
                    placeholder="Describe the objective or anomaly..."
                    rows={12}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 border-[3px] border-black font-mono text-xs focus:outline-none focus:ring-0 focus:border-red-600 bg-zinc-50 text-black placeholder-zinc-400"
                  />
                </>
              ) : (
                <div className="min-h-[400px] p-8 border-[3px] border-black bg-white overflow-y-auto">
                  <div className="mb-6 pb-6 border-b border-zinc-200">
                    <h1 className="text-2xl font-black text-black uppercase tracking-tighter italic">{title || 'Untitled_Payload'}</h1>
                  </div>
                  <div className="text-black min-h-[100px]">
                    <MarkdownViewer content={description} theme="light" />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-zinc-100 p-6 border-t-[3px] border-black flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="bg-red-600 hover:bg-black text-white font-black uppercase tracking-widest py-3 px-8 border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 transition-all"
              >
                {isSubmitting ? 'Deploying...' : 'Deploy Issue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};



import { languageColors } from '../utils/languageColors';
import { LoadingScreen } from '../components/ui/loading-states';
import { CommitDiffPage } from '../components/repository/CommitDiffPage';
import { PullRequestsPanel } from '../components/repository/PullRequestsPanel';
import { RepositoryAdminPanel } from '../components/repository/RepositoryAdminPanel';
import { WikiPanel } from '../components/repository/WikiPanel';
import { ReleaseEditControls } from '../components/repository/ReleaseEditControls';
import { useRepositoryData } from '../components/repository/useRepositoryData';

const CommitDetailView = ({ username, repoName, commits }: { username: string, repoName: string, commits: any[] }) => {
  const { commitId } = useParams();
  const { getToken } = useAuth();
  const [changedFiles, setChangedFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const commit = commits.find(c => c.id === commitId);

  useEffect(() => {
    if (!commitId) return;
    const loadCommitFiles = async () => {
      try {
        const token = await getToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`/api/repos/${username}/${repoName}/commits/${commitId}/files`, { headers });
        const data = res.ok ? await res.json() : [];
        setChangedFiles(Array.isArray(data) ? data : []);
      } catch {
        setChangedFiles([]);
      } finally {
        setLoading(false);
      }
    };
    loadCommitFiles();
  }, [commitId, getToken, username, repoName]);

  if (loading) return <div className="p-32 text-center text-zinc-500 font-black uppercase tracking-widest italic animate-pulse">Syncing Commit Data...</div>;
  if (!commit) return <div className="p-32 text-center text-red-500 font-black uppercase tracking-widest italic">Commit_Hash_Invalid: Operational log not found.</div>;

  return (
    <div className="space-y-12">
      {/* Commit Info Header */}
      <div className="border-[4px] border-black bg-zinc-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-black border-2 border-zinc-800 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(220,38,38,0.5)]">
              <img src={commit.authorAvatarUrl} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white italic">{commit.message}</h2>
              <div className="flex items-center gap-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <span>Operator: <span className="text-red-500">{commit.authorUsername}</span></span>
                <span className="w-1 h-1 bg-zinc-800 rounded-full"></span>
                <span>Committed: <span className="text-zinc-400">{format(new Date(commit.timestamp), 'MMM d, yyyy · HH:mm')}</span></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-black border-2 border-zinc-800 px-6 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
             <Code className="w-4 h-4 text-red-600" />
             <span className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-widest">{commit.id}</span>
          </div>
        </div>
      </div>

      {/* Changed Files List */}
      <div className="space-y-8">
        <h3 className="text-xs font-black text-zinc-600 uppercase tracking-[0.3em] flex items-center gap-4">
          <Activity className="w-4 h-4 text-red-600" />
          Modified_Buffer_Segments ({changedFiles.length})
        </h3>
        
        <div className="space-y-8">
          {changedFiles.map((file) => {
            const ext = file.path.split('.').pop() || 'text';
            const lang = Prism.languages[ext] ? ext : 'javascript';
            const lines = file.content.split('\n');

            return (
              <div key={file.id} className="border-[4px] border-black bg-[#0d0d0d] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <div className="bg-zinc-900 border-b-[4px] border-black px-8 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileIcon className="w-4 h-4 text-red-600" />
                    <span className="text-[11px] font-black text-white uppercase tracking-widest italic">{file.path}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {file.previousContent ? (
                       <span className="text-[9px] font-black bg-emerald-600/20 text-emerald-500 px-3 py-1 border border-emerald-900/50 uppercase tracking-widest">Modified_Delta</span>
                    ) : (
                       <span className="text-[9px] font-black bg-red-600 text-white px-3 py-1 border border-black uppercase tracking-widest">New_Origin</span>
                    )}
                  </div>
                </div>
                <div className="p-0 overflow-auto bg-[#050505]">
                  <div className="relative flex">
                    {/* Line Numbers */}
                    <div className="bg-[#080808] border-r border-zinc-900 px-6 py-10 text-right select-none min-w-[70px]">
                      {lines.map((_, i) => (
                        <div key={i} className="text-[9px] font-bold text-zinc-700 leading-[1.6]">{i + 1}</div>
                      ))}
                    </div>
                    {/* Code with Diff Highlighting */}
                    <div className="flex-1 py-10">
                      {lines.map((line: string, i: number) => {
                        const prevLines = file.previousContent?.split('\n') || [];
                        const isAdded = !prevLines.includes(line);
                        return (
                          <div key={i} className={`flex ${isAdded ? 'bg-emerald-900/20' : ''}`}>
                            <pre className={`language-${lang} m-0 !bg-transparent !border-0 !p-0 !px-10 selection:bg-red-600/30 flex-1 leading-[1.6]`}>
                              <code 
                                className={isAdded ? 'text-emerald-400' : ''}
                                dangerouslySetInnerHTML={{ __html: Prism.highlight(line || ' ', Prism.languages[lang] || Prism.languages.javascript, lang) }} 
                              />
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TagDetailView = ({
  username,
  repoName,
  tags,
  loading
}: {
  username: string;
  repoName: string;
  tags: any[];
  loading: boolean;
}) => {
  const { tagName } = useParams();
  const normalizedTagName = decodeURIComponent(tagName || '');
  const tag = tags.find((entry: any) => entry.name === normalizedTagName);

  if (loading) {
    return <div className="p-32 text-center text-zinc-500 font-black uppercase tracking-widest italic animate-pulse">Loading_Tag_Record...</div>;
  }

  if (!tag) {
    return (
      <div className="border-[4px] border-black bg-[#0d0d0d] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="bg-zinc-900 border-b-[4px] border-black px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <TagIcon className="w-5 h-5 text-red-600" />
            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em] italic">Tag_Record_Not_Found</h2>
          </div>
          <Link to={`/${username}/${repoName}/tags`} className="text-[10px] font-black text-zinc-400 hover:text-white uppercase tracking-widest">
            Back to tags
          </Link>
        </div>
        <div className="p-12">
          <p className="text-sm text-zinc-400">No tag exists at <span className="text-white font-mono">{normalizedTagName}</span>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="border-[3px] border-black bg-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] overflow-hidden">
        <div className="bg-red-600 border-b-[3px] border-black px-10 py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-96 bg-black/10 -skew-x-[35deg] translate-x-16"></div>
          <div className="relative space-y-3">
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 bg-black text-white flex items-center justify-center border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,0.25)]">
                <TagIcon className="w-5 h-5 text-red-500" />
              </span>
              <h2 className="text-2xl font-black text-white italic">{tag.name}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-red-100">
              <span>
                Created <span className="text-white">{tag.createdAt ? format(new Date(tag.createdAt), 'MMM dd, yyyy') : 'Recently'}</span>
              </span>
              <span className="w-1 h-1 bg-black"></span>
              <span>
                Age <span className="text-white">{tag.createdAt ? formatDistanceToNow(new Date(tag.createdAt), { addSuffix: true }) : 'unknown'}</span>
              </span>
              {tag.creator && (
                <>
                  <span className="w-1 h-1 bg-black"></span>
                  <span>
                    Author <span className="text-white">{tag.creator.username}</span>
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="relative flex items-center gap-3">
            <Link
              to={`/${username}/${repoName}/tags`}
              className="bg-white text-black border-[3px] border-black px-5 py-3 text-[11px] font-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all"
            >
              All Tags
            </Link>
            <Link
              to={`/${username}/${repoName}/commits/${tag.commitId}`}
              className="bg-black text-white border-[3px] border-black px-5 py-3 text-[11px] font-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:bg-white hover:text-black transition-all"
            >
              View Commit
            </Link>
          </div>
        </div>

        <div className="grid gap-8 p-8 bg-[#050505] lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="border-[3px] border-black bg-[#080808] text-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
            <div className="border-b-[3px] border-black bg-black px-6 py-4">
              <h3 className="text-sm font-black text-white">Release notes</h3>
            </div>
            <div className="p-6">
              {tag.message ? (
                <MarkdownViewer content={tag.message} />
              ) : (
                <p className="text-sm text-zinc-500 italic">No release notes were attached to this tag.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-[3px] border-black bg-white text-black shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
              <div className="border-b-[3px] border-black bg-black px-6 py-4">
                <h3 className="text-sm font-black text-white">Reference</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs font-black text-red-600 mb-2">Tag URL</p>
                  <p className="text-xs font-mono font-bold text-black break-all">{window.location.origin}/{username}/{repoName}/tags/{encodeURIComponent(tag.name)}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-red-600 mb-2">Commit hash</p>
                  <p className="text-xs font-mono font-bold text-black break-all">{tag.commitId}</p>
                </div>
                {tag.commit?.message && (
                  <div>
                    <p className="text-xs font-black text-red-600 mb-2">Commit message</p>
                    <p className="text-sm font-bold text-black">{tag.commit.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const ReleaseDetailView = ({
  username,
  repoName,
  releases,
  loading
}: {
  username: string;
  repoName: string;
  releases: any[];
  loading: boolean;
}) => {
  const { releaseTag } = useParams();
  const normalizedReleaseTag = decodeURIComponent(releaseTag || '');
  const release = releases.find((entry: any) => entry.tagName === normalizedReleaseTag);

  if (loading) {
    return <div className="p-32 text-center text-zinc-500 font-black uppercase tracking-widest italic animate-pulse">Loading_Release_Record...</div>;
  }

  if (!release) {
    return (
      <div className="border-[4px] border-black bg-[#0d0d0d] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="bg-zinc-900 border-b-[4px] border-black px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Package className="w-5 h-5 text-red-600" />
            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em] italic">Release_Record_Not_Found</h2>
          </div>
          <Link to={`/${username}/${repoName}/releases`} className="text-[10px] font-black text-zinc-400 hover:text-white uppercase tracking-widest">
            Back to releases
          </Link>
        </div>
        <div className="p-12">
          <p className="text-sm text-zinc-400">No release exists at <span className="text-white font-mono">{normalizedReleaseTag}</span>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="border-[3px] border-black bg-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] overflow-hidden">
        <div className="bg-red-600 border-b-[3px] border-black px-10 py-7 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-96 bg-black/10 -skew-x-[35deg] translate-x-16"></div>
          <div className="relative space-y-4 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-10 h-10 bg-black text-white flex items-center justify-center border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,0.25)]">
                <Package className="w-5 h-5 text-red-500" />
              </span>
              <h2 className="text-2xl font-black text-white italic break-words">{release.title}</h2>
              {release.isDraft && (
                <span className="border-2 border-black bg-white px-2 py-1 text-[10px] font-black text-black">Draft</span>
              )}
              {release.isPrerelease && (
                <span className="border-2 border-black bg-black px-2 py-1 text-[10px] font-black text-white">Pre-release</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-red-100">
              <Link to={`/${username}/${repoName}/tags/${encodeURIComponent(release.tagName)}`} className="inline-flex items-center gap-2 bg-black text-white px-2 py-1 hover:bg-white hover:text-black transition-colors">
                <TagIcon className="w-4 h-4" />
                {release.tagName}
              </Link>
              <span className="w-1 h-1 bg-black"></span>
              <span>
                {release.publishedAt ? 'Published' : 'Created'} <span className="text-white">{format(new Date(release.publishedAt || release.createdAt), 'MMM dd, yyyy')}</span>
              </span>
              {release.author?.username && (
                <>
                  <span className="w-1 h-1 bg-black"></span>
                  <span>
                    Author <span className="text-white">{release.author.username}</span>
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="relative flex items-center gap-3">
            <Link
              to={`/${username}/${repoName}/releases`}
              className="bg-white text-black border-[3px] border-black px-5 py-3 text-[11px] font-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all"
            >
              All Releases
            </Link>
          </div>
        </div>

        <div className="grid gap-8 p-8 bg-[#050505] lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="border-[3px] border-black bg-[#080808] text-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
            <div className="border-b-[3px] border-black bg-black px-6 py-4">
              <h3 className="text-sm font-black text-white">Release notes</h3>
            </div>
            <div className="p-6">
              {release.body ? (
                <MarkdownViewer content={release.body} />
              ) : (
                <p className="text-sm text-zinc-500 italic">No release notes were provided.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <ReleaseEditControls
              username={username}
              repoName={repoName}
              release={release}
              onChanged={() => window.location.reload()}
            />

            <div className="border-[3px] border-black bg-white text-black shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
              <div className="border-b-[3px] border-black bg-black px-6 py-4 flex items-center justify-between">
                <h3 className="text-sm font-black text-white">Assets</h3>
                <span className="bg-red-600 text-white px-2 py-1 text-[10px] font-black">{release.assets?.length || 0}</span>
              </div>
              <div className="divide-y-[3px] divide-black">
                {release.assets?.length > 0 ? (
                  release.assets.map((asset: any) => (
                    <a
                      key={asset.id}
                      href={asset.downloadUrl}
                      className="flex items-center gap-3 px-5 py-4 hover:bg-red-50 transition-colors"
                    >
                      <span className="w-8 h-8 bg-black text-white flex items-center justify-center flex-shrink-0">
                        <FileArchive className="w-4 h-4 text-red-600" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-black truncate">{asset.name}</p>
                        <p className="text-[10px] font-bold text-zinc-500">{formatBytes(asset.size)}</p>
                      </div>
                      <Download className="w-4 h-4 text-black" />
                    </a>
                  ))
                ) : (
                  <p className="px-5 py-6 text-xs font-bold text-zinc-500 italic">No binaries attached.</p>
                )}
              </div>
            </div>

            <div className="border-[3px] border-black bg-white text-black shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
              <div className="border-b-[3px] border-black bg-black px-6 py-4">
                <h3 className="text-sm font-black text-white">Reference</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs font-black text-red-600 mb-2">Release URL</p>
                  <p className="text-xs font-mono font-bold text-black break-all">{window.location.origin}/{username}/{repoName}/releases/{encodeURIComponent(release.tagName)}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-red-600 mb-2">Tag</p>
                  <p className="text-xs font-mono font-bold text-black break-all">{release.tagName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Repository = () => {
  const { username, repoName } = useParams<{ username: string, repoName: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  
  const [currentBranchName, setCurrentBranchName] = useState('main');
  const [currentPath, setCurrentPath] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteFilePath, setDeleteFilePath] = useState('');
  const [deleteCommitMsg, setDeleteCommitMsg] = useState('Delete file');
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [isAddFileOpen, setIsAddFileOpen] = useState(false);
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [uploadFiles, setUploadFiles] = useState<{ file: File, path: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [commitSummary, setCommitSummary] = useState('Add files via upload');
  const [commitDescription, setCommitDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [editAboutText, setEditAboutText] = useState('');
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('');
  const [isSavingAbout, setIsSavingAbout] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagMessage, setNewTagMessage] = useState('');
  const [selectedCommitForTag, setSelectedCommitForTag] = useState('');
  const [isCreatingRelease, setIsCreatingRelease] = useState(false);
  const [isSavingRelease, setIsSavingRelease] = useState(false);
  const [isCreatingWikiPage, setIsCreatingWikiPage] = useState(false);
  const [newWikiTitle, setNewWikiTitle] = useState('');
  const [newWikiContent, setNewWikiContent] = useState('');
  const [newReleaseTag, setNewReleaseTag] = useState('');
  const [newReleaseCommit, setNewReleaseCommit] = useState('');
  const [newReleaseTitle, setNewReleaseTitle] = useState('');
  const [newReleaseBody, setNewReleaseBody] = useState('');
  const [newReleaseDraft, setNewReleaseDraft] = useState(false);
  const [newReleasePrerelease, setNewReleasePrerelease] = useState(false);
  const [newReleaseAssets, setNewReleaseAssets] = useState<File[]>([]);
  const [isDraggingReleaseAsset, setIsDraggingReleaseAsset] = useState(false);
  const addFileRef = React.useRef<HTMLDivElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(f => {
        // Use webkitRelativePath if available (from folder selection)
        // Otherwise fallback to name
        const path = (f as any).webkitRelativePath || f.name;
        return { file: f, path };
      });
      setUploadFiles(prev => [...prev, ...newFiles].slice(0, 20));
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsAnalyzing(true);
    setAnalyzedCount(0);
    
    const filesWithPaths: { file: File, path: string }[] = [];
    const items = e.dataTransfer.items;
    
    const traverseEntry = async (entry: any, path = "") => {
      // HARD LIMIT CHECK: Stop scanning if we hit 20 files
      if (filesWithPaths.length >= 20) return;

      // SKIP SYSTEM JUNK: Comprehensive list for 100+ languages/frameworks
      const skipDirs = [
        'node_modules', '.git', '.next', 'dist', 'build', 'target', 'vendor', 'out', // Web/Rust/Go
        '__pycache__', 'venv', '.venv', '.pytest_cache', '.mypy_cache', // Python
        '.dart_tool', '.pub-cache', '.fvm', // Dart/Flutter
        '.gradle', '.idea', '.settings', 'bin', 'obj', '.vs', // Java/Kotlin/C#/C++
        '.terraform', '.serverless', '.aws-sam', // DevOps
        '.bundle', 'vendor/bundle', // Ruby
        '.vscode', '.DS_Store', 'logs' // General Junk
      ];
      if (entry.isDirectory && skipDirs.includes(entry.name)) {
        console.warn(`Sovereign Filter: Skipping system directory ${entry.name}`);
        return;
      }

      if (entry.isFile) {
        try {
          const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
          filesWithPaths.push({ file, path: path + file.name });
          setAnalyzedCount(prev => Math.min(20, prev + 1));
        } catch (e) {
          console.error("File read error:", e);
        }
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readEntries = () => new Promise<any[]>((resolve, reject) => reader.readEntries(resolve, reject));
        
        let hasChildren = false;
        try {
          let entries = await readEntries();
          while (entries.length > 0 && filesWithPaths.length < 20) {
            hasChildren = true;
            // Process entries in parallel
            await Promise.all(entries.map(child => traverseEntry(child, path + entry.name + "/")));
            entries = await readEntries();
          }
          if (!hasChildren && filesWithPaths.length < 20) {
            const gitkeep = new File([""], ".gitkeep", { type: "text/plain" });
            filesWithPaths.push({ file: gitkeep, path: path + entry.name + "/.gitkeep" });
            setAnalyzedCount(prev => Math.min(20, prev + 1));
          }
        } catch (e) {
          console.error("Directory read error:", e);
        }
      }
    };

    try {
      if (items && items.length > 0) {
        const rootPromises = [];
        for (let i = 0; i < items.length; i++) {
          if (filesWithPaths.length >= 20) break;
          const item = items[i];
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            rootPromises.push(traverseEntry(entry));
          } else {
            const file = item.getAsFile();
            if (file) {
              filesWithPaths.push({ file, path: file.name });
              setAnalyzedCount(prev => Math.min(20, prev + 1));
            }
          }
        }
        await Promise.all(rootPromises);
      }

      // If no files found through items, fallback to standard files
      if (filesWithPaths.length === 0) {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          for (let i = 0; i < Math.min(files.length, 20); i++) {
            filesWithPaths.push({ file: files[i], path: files[i].name });
          }
          setAnalyzedCount(filesWithPaths.length);
        }
      }

      if (filesWithPaths.length > 0) {
        // Single batch update to prevent race conditions and UI flickering
        setUploadFiles(prev => {
          const combined = [...prev, ...filesWithPaths];
          const unique = combined.filter((v, i, a) => a.findIndex(t => t.path === v.path) === i);
          return unique.slice(0, 20); // Hard 20 file limit
        });
      }
    } catch (err) {
      console.error("Drop handling error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (uploadFiles.length === 0) return;
    setLoading(true);
    setUploadProgress(0);
    const failures: string[] = [];
    const skippedLarge: string[] = [];

    try {
      // Get fresh token
      const token = await getToken();
      if (!token) {
        alert("Session expired. Please log in again.");
        setLoading(false);
        return;
      }

      for (let i = 0; i < uploadFiles.length; i++) {
        const item = uploadFiles[i];
        
        // Safety check for file size (1MB limit for server)
        if (item.file.size > 1024 * 1024) {
          skippedLarge.push(item.path);
          console.warn(`Skipping ${item.path}: File too large (>1MB)`);
          continue;
        }

        try {
          const content = await item.file.text();
          const res = await fetch(`/api/repos/${username}/${repoName}/files`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              path: item.path, 
              content, 
              message: commitSummary,
              branch: currentBranchName
            })
          });

          if (!res.ok) {
            const errorText = await res.text();
            failures.push(`${item.path} (${res.status}: ${errorText || res.statusText})`);
            console.error(`Failed to upload ${item.path}: ${res.status} ${res.statusText}`);
          }
        } catch (fileErr) {
          failures.push(`${item.path} (Processing Error)`);
          console.error(`Processing error for ${item.path}:`, fileErr);
        }
        setUploadProgress(Math.round(((i + 1) / uploadFiles.length) * 100));
      }

      if (failures.length > 0 || skippedLarge.length > 0) {
        let msg = "Synchronization complete with some issues:\n";
        if (failures.length > 0) msg += `- ${failures.length} files failed to upload.\n`;
        if (skippedLarge.length > 0) msg += `- ${skippedLarge.length} files were skipped because they exceed the 1MB size limit.\n`;
        alert(msg + "Check console for full list of paths.");
      }
      
      navigate(`/${username}/${repoName}`);
    } catch (err) {
      console.error("Global upload error:", err);
      alert("A critical error occurred. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addFileRef.current && !addFileRef.current.contains(event.target as Node)) {
        setIsAddFileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const currentTab = location.pathname.split('/')[3] || '';

  useEffect(() => {
    const routeBranch = location.pathname.match(/\/(blob|edit|new|upload)\/([^/]+)/)?.[2];
    if (routeBranch) {
      const decodedBranch = decodeURIComponent(routeBranch);
      if (decodedBranch !== currentBranchName) setCurrentBranchName(decodedBranch);
    }
  }, [location.pathname]);

  const {
    repo,
    setRepo,
    files,
    issues,
    commits,
    tags,
    setTags,
    releases,
    setReleases,
    branches,
    pullRequests,
    setPullRequests,
    topics,
    setTopics,
    wikiPages,
    setWikiPages,
    repoSettings,
    setRepoSettings,
    contributors,
    accessDenied,
    loading,
    loadingMore,
    hasMoreFiles,
    authedFetch,
    fetchRepoData,
    loadMoreFiles,
  } = useRepositoryData({
    username,
    repoName,
    currentBranchName,
    getToken,
  });

  useEffect(() => {
    if (!isEditingAbout) {
      setEditAboutText(repo?.description || '');
      setEditWebsiteUrl(repo?.websiteUrl || '');
    }
  }, [repo, isEditingAbout]);

  if (loading || !isLoaded) return <LoadingScreen />;
  if (!user) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">Access Restricted</h2>
        <p className="text-gray-500 mb-6">Please sign in to view this repository.</p>
        <Link to="/login" className="bg-[#dc2626] text-white px-8 py-3 font-bold text-xs hover:bg-red-500 transition-all">
          Go to login
        </Link>
      </div>
    );
  }
  if (accessDenied) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">Private Repository</h2>
        <p className="text-gray-500 mb-6">Only the owner or accepted collaborators can view this repository.</p>
        <Link to={`/${username}`} className="bg-[#dc2626] text-white px-8 py-3 font-bold text-xs hover:bg-red-500 transition-all">
          Back to profile
        </Link>
      </div>
    );
  }
  if (!repo) return <div className="p-8 text-center text-xl">Repository not found</div>;

  const handleStar = async () => {
    if (!user) return;
    
    // Optimistic Update
    const originalRepo = { ...repo };
    const newIsStarred = !repo.isStarred;
    setRepo({
      ...repo,
      isStarred: newIsStarred,
      starCount: repo.isStarred ? Math.max(0, repo.starCount - 1) : repo.starCount + 1
    });

    try {
      const token = await getToken();
      const method = originalRepo.isStarred ? 'DELETE' : 'POST';
      const res = await fetch(`/api/repos/${username}/${repoName}/star`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        setRepo(originalRepo); // Rollback
      }
    } catch (err) {
      console.error('Star operation failed:', err);
      setRepo(originalRepo); // Rollback
    }
  };

  const resetReleaseForm = () => {
    setNewReleaseTag('');
    setNewReleaseCommit('');
    setNewReleaseTitle('');
    setNewReleaseBody('');
    setNewReleaseDraft(false);
    setNewReleasePrerelease(false);
    setNewReleaseAssets([]);
    setIsDraggingReleaseAsset(false);
  };

  const addReleaseAssetFiles = (files: File[]) => {
    setNewReleaseAssets(prev => {
      const combined = [...prev, ...files];
      return combined.filter((file, index, all) => (
        all.findIndex(candidate => (
          candidate.name === file.name &&
          candidate.size === file.size &&
          candidate.lastModified === file.lastModified
        )) === index
      ));
    });
  };

  const handleReleaseAssetDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingReleaseAsset(false);
    addReleaseAssetFiles(Array.from(e.dataTransfer.files || []));
  };

  const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleCreateRelease = async () => {
    if (!newReleaseTag.trim() || !newReleaseTitle.trim()) {
      alert('Release tag and title are required');
      return;
    }

    setIsSavingRelease(true);
    try {
      const token = await getToken();
      const encodedAssets = await Promise.all(newReleaseAssets.map(async (file) => ({
        name: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        dataBase64: await fileToBase64(file),
      })));

      const res = await fetch(`/api/repos/${username}/${repoName}/releases`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tagName: newReleaseTag.trim(),
          targetCommitId: newReleaseCommit || undefined,
          title: newReleaseTitle.trim(),
          body: newReleaseBody || null,
          isDraft: newReleaseDraft,
          isPrerelease: newReleasePrerelease,
          assets: encodedAssets,
        })
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        alert(error.error || 'Failed to create release');
        return;
      }

      const createdRelease = await res.json();
      setReleases([createdRelease, ...releases]);
      setIsCreatingRelease(false);
      resetReleaseForm();
      navigate(`/${username}/${repoName}/releases/${encodeURIComponent(createdRelease.tagName)}`);
    } catch (err) {
      console.error('Error creating release:', err);
      alert('Error creating release');
    } finally {
      setIsSavingRelease(false);
    }
  };

  const handleDeleteRelease = async (releaseId: string) => {
    if (!confirm('Delete this release and all attached binaries?')) return;
    const token = await getToken();
    const res = await fetch(`/api/repos/${username}/${repoName}/releases/${releaseId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setReleases(releases.filter((release: any) => release.id !== releaseId));
  };

  const handleCreateBranch = async () => {
    const name = prompt('New branch name');
    if (!name) return;
    const token = await getToken();
    const res = await fetch(`/api/repos/${username}/${repoName}/branches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, from: currentBranchName })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      alert(error.error || 'Failed to create branch');
      return;
    }
    const branch = await res.json();
    setBranches([...branches, branch]);
    setCurrentBranchName(branch.name);
    setCurrentPath('');
    setIsBranchMenuOpen(false);
  };

  const handleCreatePullRequest = async () => {
    const defaultBranch = repoSettings?.defaultBranch || 'main';
    if (currentBranchName === defaultBranch) {
      alert('Create or switch to a feature branch before opening a pull request.');
      return;
    }
    const title = prompt('Pull request title', `Merge ${currentBranchName} into ${defaultBranch}`);
    if (!title) return;
    const token = await getToken();
    const res = await fetch(`/api/repos/${username}/${repoName}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, sourceBranch: currentBranchName, targetBranch: defaultBranch })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      alert(error.error || 'Failed to create pull request');
      return;
    }
    const pr = await res.json();
    setPullRequests([pr, ...pullRequests]);
    navigate(`/${username}/${repoName}/pulls`);
  };

  const handleMergePullRequest = async (pullId: string) => {
    const defaultBranch = repoSettings?.defaultBranch || 'main';
    const token = await getToken();
    const compareRes = await authedFetch(`/api/repos/${username}/${repoName}/pulls/${pullId}/compare`);
    const comparison = await compareRes.json();
    if (comparison.conflicts?.length > 0) {
      alert(`Merge blocked by conflicts in: ${comparison.conflicts.map((file: any) => file.path).join(', ')}`);
      return;
    }
    const res = await fetch(`/api/repos/${username}/${repoName}/pulls/${pullId}/merge`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      alert(error.error || 'Failed to merge pull request');
      return;
    }
    setPullRequests(pullRequests.map((pull: any) => pull.id === pullId ? { ...pull, status: 'merged' } : pull));
    setCurrentBranchName(defaultBranch);
  };

  const handleSaveTopics = async () => {
    const raw = prompt('Topics separated by commas', topics.map((topic: any) => topic.name).join(', '));
    if (raw === null) return;
    const nextTopics = raw.split(',').map(topic => topic.trim()).filter(Boolean);
    const token = await getToken();
    const res = await fetch(`/api/repos/${username}/${repoName}/topics`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ topics: nextTopics })
    });
    if (res.ok) setTopics(await res.json());
  };

  const handleSaveRepoSettings = async (nextSettings: any) => {
    const token = await getToken();
    const res = await fetch(`/api/repos/${username}/${repoName}/settings`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(nextSettings)
    });
    if (res.ok) setRepoSettings(await res.json());
  };

  const handleCreateWikiPage = async () => {
    if (!newWikiTitle.trim() || !newWikiContent.trim()) return;
    const token = await getToken();
    const res = await fetch(`/api/repos/${username}/${repoName}/wiki`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newWikiTitle, content: newWikiContent })
    });
    if (res.ok) {
      const page = await res.json();
      setWikiPages([page, ...wikiPages]);
      setIsCreatingWikiPage(false);
      setNewWikiTitle('');
      setNewWikiContent('');
    }
  };

  const readmeFile = files.find(f => f.path.toLowerCase() === 'readme.md');
  return (
    <div className="bg-[#080808] min-h-screen text-white flex-1">
      {/* Repo Header */}
      <div className="bg-[#0d0d0d] border-b border-zinc-900 pt-6">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center flex-wrap gap-3 text-2xl md:text-3xl">
                  <Book className="w-7 h-7 text-red-600" />
                  <Link to={`/${username}`} className="text-zinc-400 hover:text-white transition-colors font-medium">{username}</Link>
                  <span className="text-zinc-700 font-light">/</span>
                  <Link to={`/${username}/${repoName}`} className="font-black text-white hover:text-red-500 transition-colors tracking-tight">{repoName}</Link>
                  <span className="text-[10px] font-black border-2 border-zinc-800 bg-zinc-900 px-3 py-1 text-zinc-400 ml-2 tracking-tight">
                    {repo.isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
                
                {repo.description && (
                  <p className="text-sm md:text-base text-zinc-400 font-medium leading-relaxed max-w-3xl">
                    {repo.description}
                  </p>
                )}

                {topics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic: any) => (
                      <span key={topic.id} className="text-[9px] font-black bg-[#121212] text-red-600 border border-zinc-800 px-2.5 py-1 uppercase tracking-widest hover:border-red-600 cursor-pointer transition-all">
                        {topic.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
                <div className="flex border-2 border-black shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] group overflow-hidden">
                  <button 
                    onClick={handleStar}
                    className={`flex items-center gap-2 px-4 py-2 text-[11px] font-black transition-all ${
                      repo.isStarred 
                        ? 'bg-red-600 text-white' 
                        : 'bg-white text-black hover:bg-zinc-100'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${repo.isStarred ? 'fill-current' : 'text-red-600'}`} />
                    <span>{repo.isStarred ? 'Unstar' : 'Star'}</span>
                  </button>
                  <div className="bg-black px-4 py-2 text-[11px] font-black text-white border-l-2 border-black">
                    {repo.starCount || 0}
                  </div>
                </div>
                 {user?.id !== repo.ownerId && (
                   <Link to={`/fork/${username}/${repoName}`} className="neo-brutal-button !py-2 !px-6 !text-[11px]">
                     Fork
                   </Link>
                 )}
              </div>
            </div>

          {/* Tabs */}
          <div className="relative group">
            <nav className="flex gap-1 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-red-600">
              {[
                { id: '', label: 'Code', icon: <Code className="w-4 h-4" /> },
                { id: 'issues', label: 'Issues', icon: <CircleDot className="w-4 h-4" />, count: issues.length },
                { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, condition: user?.id === repo?.ownerId || user?.username === username },
                { id: 'wiki', label: 'Wiki', icon: <BookOpen className="w-4 h-4" />, count: wikiPages.length },
                { id: 'pulls', label: 'Pull requests', icon: <GitPullRequest className="w-4 h-4" />, count: pullRequests.filter((pull: any) => pull.status === 'open').length },
                { id: 'commits', label: 'Commits', icon: <History className="w-4 h-4" />, count: commits.length },
                { id: 'insights', label: 'Insights', icon: <BarChart3 className="w-4 h-4" /> },
              ].map(tab => (
                (tab.condition === undefined || tab.condition) && (
                  <Link 
                    key={tab.label}
                    to={`/${username}/${repoName}${tab.id ? '/' + tab.id : ''}`}
                    className={`shrink-0 whitespace-nowrap px-4 sm:px-6 py-2.5 text-[11px] font-black flex items-center gap-2 sm:gap-3 border-[3px] transition-all relative group font-inter tracking-tight ${
                      currentTab === tab.id 
                        ? 'border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] z-10' 
                        : 'border-transparent text-zinc-500 hover:text-white hover:border-zinc-800 bg-[#121212]/30'
                    }`}
                  >
                    <div className={`transition-colors ${currentTab === tab.id ? 'text-red-600' : 'group-hover:text-red-500'}`}>
                      {tab.icon}
                    </div>
                    <span className={tab.id === '' || tab.id === 'settings' || currentTab === tab.id ? 'inline' : 'hidden sm:inline'}>
                      {tab.label}
                    </span>
                    {tab.count !== undefined && (
                      <span className={`px-1.5 py-0.5 text-[8px] font-black border ${currentTab === tab.id ? 'bg-red-600 text-white border-black' : 'bg-zinc-800 text-zinc-600 border-zinc-700'}`}>
                        {tab.count}
                      </span>
                    )}
                  </Link>
                )
              ))}
            </nav>
            {/* Sovereign Gradient Mask */}
            <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#0d0d0d] to-transparent pointer-events-none md:hidden"></div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-8 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-6">
                {/* Action Bar */}
                 <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="relative">
                    <button
                      onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
                      className="flex items-center gap-2 bg-[#121212] border border-zinc-800 px-4 py-2 text-xs font-bold text-white hover:border-zinc-600 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group"
                    >
                      <GitBranch className="w-3.5 h-3.5 text-red-600" />
                      <span className="group-hover:text-red-500 transition-colors">{currentBranchName}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
                    </button>
                    {isBranchMenuOpen && (
                      <div className="absolute left-0 top-full mt-2 w-[min(18rem,calc(100vw-2rem))] bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] z-50">
                        <div className="bg-red-600 border-b-[3px] border-black px-4 py-2 text-[10px] font-black text-white uppercase tracking-widest">Branches</div>
                        <div className="max-h-64 overflow-y-auto p-2">
                          {branches.map((branch: any) => (
                            <button
                              key={branch.id}
                              onClick={() => {
                                setCurrentBranchName(branch.name);
                                setCurrentPath('');
                                setIsBranchMenuOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-black hover:bg-red-50 ${currentBranchName === branch.name ? 'text-red-600' : 'text-black'}`}
                            >
                              {branch.name}
                            </button>
                          ))}
                        </div>
                        {user?.id === repo.ownerId && (
                          <button
                            onClick={handleCreateBranch}
                            className="w-full border-t-[3px] border-black px-4 py-3 text-xs font-black text-black hover:bg-black hover:text-white transition-colors"
                          >
                            Create new branch
                          </button>
                        )}
                      </div>
                    )}
                    </div>
                    <div className="hidden md:flex items-center gap-5 text-xs font-bold text-zinc-500">
                      <span className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors">
                        <GitBranch className="w-3.5 h-3.5" /> <strong>{branches.length || 1}</strong> Branch
                      </span>
                      <span className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors">
                        <Tag className="w-3.5 h-3.5" /> <strong>0</strong> Tags
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex w-full sm:w-auto items-center gap-3 relative">
                    {user && user.id === repo.ownerId && (
                      <div className="relative">
                        <button
                          onClick={() => setIsAddFileOpen(!isAddFileOpen)}
                          className="flex items-center gap-2 bg-white text-black border-[3px] border-black px-4 py-2 text-[11px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
                        >
                          Add file <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {isAddFileOpen && (
                          <>
                            <div className="fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-sm" onClick={() => setIsAddFileOpen(false)}></div>
                            <div className="fixed md:absolute right-0 left-0 md:left-auto bottom-0 md:bottom-auto md:top-full mb-0 md:mt-3 w-full md:w-64 bg-white border-t-[4px] md:border-[4px] border-black shadow-[0px_-10px_40px_rgba(0,0,0,0.3)] md:shadow-[10px_10px_0px_0px_rgba(220,38,38,1)] z-50 animate-in slide-in-from-bottom md:slide-in-from-top duration-300">
                              <div className="md:hidden bg-red-600 px-6 py-5 border-b-[4px] border-black flex items-center justify-between">
                                <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] italic">Add_Operation_Protocol</span>
                                <X className="w-6 h-6 text-white cursor-pointer" onClick={() => setIsAddFileOpen(false)} />
                              </div>
                              <div className="p-3 md:p-2">
                                <Link 
                                  to={`/${username}/${repoName}/new/${encodeURIComponent(currentBranchName)}`}
                                  className="flex items-center gap-4 w-full p-4 md:p-3 text-[11px] font-black text-black hover:bg-red-50 transition-colors group uppercase tracking-widest"
                                  onClick={() => setIsAddFileOpen(false)}
                                >
                                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center group-hover:bg-red-600 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <Plus className="w-4 h-4" />
                                  </div>
                                  Create new file
                                </Link>
                                <button 
                                  className="flex items-center gap-4 w-full p-4 md:p-3 text-[11px] font-black text-black hover:bg-red-50 transition-colors group border-t-2 border-zinc-100 uppercase tracking-widest"
                                  onClick={() => {
                                    setIsAddFileOpen(false);
                                    navigate(`/${username}/${repoName}/upload/${encodeURIComponent(currentBranchName)}`);
                                  }}
                                >
                                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center group-hover:bg-red-600 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <Upload className="w-4 h-4" />
                                  </div>
                                  Upload files
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <button className="neo-brutal-button flex items-center gap-2 !py-2 !px-5 !text-xs w-full sm:w-auto justify-center">
                      <Code className="w-4 h-4" /> Code
                    </button>
                  </div>
                </div>

                {/* File Browser */}
                <div className="border-[3px] border-black bg-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                  <div className="bg-white border-b-[3px] border-black px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {commits.length > 0 ? (
                        <img 
                          src={commits[0].authorAvatarUrl} 
                          alt={commits[0].authorUsername}
                          className="w-10 h-10 border-[3px] border-black -rotate-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] object-cover"
                        />
                      ) : repo.owner?.avatarUrl ? (
                        <img 
                          src={repo.owner.avatarUrl} 
                          alt={username}
                          className="w-10 h-10 border-[3px] border-black -rotate-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-red-600 border-[3px] border-black flex items-center justify-center text-sm font-black italic -rotate-6 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-outfit">
                          {username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="font-outfit !not-italic">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-black">{commits.length > 0 ? commits[0].authorUsername : username}</span>
                          <span className="text-[10px] font-semibold text-zinc-400">authorized operator</span>
                        </div>
                        <div className="text-[10px] font-semibold text-zinc-500 flex items-center gap-2 !not-italic">
                          <Activity className="w-3 h-3 text-red-600" /> Latest commit: <span className="!not-italic">{commits.length > 0 ? commits[0].message : 'initial sync protocol'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                      <div className="bg-black text-white px-3 py-1.5 text-[10px] font-bold border-2 border-black font-outfit">
                        {commits.length || 1} commits
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-zinc-900/50 border-x-[3px] border-b-[3px] border-white/10 m-[3px] bg-[#050505]">
                    {files.length === 0 ? (
                      <div className="p-8 md:p-12 space-y-12 bg-[#050505]">
                        {/* Quick Setup Zone */}
                        <div className="border-[3px] border-black bg-white shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] overflow-hidden animate-in slide-in-from-top-4 duration-500">
                          <div className="bg-red-600 border-b-[3px] border-black px-6 py-5 flex items-center justify-between relative overflow-hidden">
                            {/* Diagonal Stripe Accent */}
                            <div className="absolute top-0 right-0 w-32 h-full bg-black/5 -skew-x-[45deg] translate-x-16"></div>
                            
                            <h2 className="text-xs font-black text-white uppercase italic -skew-x-12 tracking-wider relative z-10">Quick setup — operational protocol</h2>
                            <div className="flex items-center gap-3 relative z-10">
                              <span className="text-[9px] font-black text-white uppercase bg-black px-2 py-0.5">HTTPS</span>
                              <div className="w-10 h-5 bg-black border-2 border-white/20 relative">
                                <div className="absolute left-0 top-0 h-full w-1/2 bg-white"></div>
                              </div>
                            </div>
                          </div>
                          <div className="p-8 md:p-10">
                            <div className="flex flex-col md:flex-row gap-4 mb-8">
                              <div className="flex-1 bg-zinc-100 border-[3px] border-black p-5 flex items-center justify-between shadow-inner group">
                                <code className="text-sm font-black text-black truncate tracking-tight">{`https://nexusvault.io/${username}/${repoName}.git`}</code>
                                <button 
                                  onClick={() => navigator.clipboard.writeText(`https://nexusvault.io/${username}/${repoName}.git`)}
                                  className="p-2.5 bg-black text-white hover:bg-red-600 transition-all border-2 border-transparent active:scale-90"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs font-bold text-zinc-500 leading-relaxed uppercase tracking-tighter italic">
                              Initialize your vault by <Link to={`/${username}/${repoName}/new/main`} className="text-red-600 underline decoration-2 underline-offset-4 hover:bg-red-600 hover:text-white transition-all px-1">creating a new file</Link> or uploading existing data.
                            </p>
                          </div>
                        </div>

                        {/* Guides Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="space-y-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-red-600 border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                  <Terminal className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xs font-black text-white uppercase tracking-widest italic -skew-x-12">New repository_init</h3>
                              </div>
                              <div className="bg-black border-[3px] border-black p-8 relative group shadow-[8px_8px_0px_0px_rgba(220,38,38,0.2)]">
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Copy className="w-4 h-4 text-zinc-700 hover:text-red-500 cursor-pointer" />
                                </div>
                                <pre className="text-[10px] font-bold text-zinc-400 leading-7">
                                  <span className="text-red-500">echo</span> "# {repoName}" <span className="text-red-500">&gt;&gt;</span> README.md<br/>
                                  <span className="text-red-500">git</span> init<br/>
                                  <span className="text-red-500">git</span> add README.md<br/>
                                  <span className="text-red-500">git</span> commit -m "first commit"<br/>
                                  <span className="text-red-500">git</span> branch -M main<br/>
                                  <span className="text-red-500">git</span> remote add origin https://nexusvault.io/{username}/{repoName}.git<br/>
                                  <span className="text-red-500">git</span> push -u origin main
                                </pre>
                              </div>
                           </div>

                           <div className="space-y-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-black border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                  <Monitor className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xs font-black text-white uppercase tracking-widest italic -skew-x-12">Push existing_data</h3>
                              </div>
                              <div className="bg-black border-[3px] border-black p-8 relative group shadow-[8px_8px_0px_0px_rgba(220,38,38,0.2)]">
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Copy className="w-4 h-4 text-zinc-700 hover:text-red-500 cursor-pointer" />
                                </div>
                                <pre className="text-[10px] font-bold text-zinc-400 leading-7">
                                  <span className="text-red-500">git</span> remote add origin https://nexusvault.io/{username}/{repoName}.git<br/>
                                  <span className="text-red-500">git</span> branch -M main<br/>
                                  <span className="text-red-500">git</span> push -u origin main
                                </pre>
                              </div>
                           </div>
                        </div>

                        {/* Onboarding Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6">
                           <div className="border-[3px] border-black bg-white p-10 flex flex-col items-center text-center group hover:bg-zinc-50 transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/5 -rotate-45 translate-x-8 -translate-y-8"></div>
                              <div className="w-20 h-20 bg-black border-[3px] border-black flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
                                <Monitor className="w-10 h-10 text-white group-hover:text-red-500" />
                              </div>
                              <h4 className="text-lg font-black text-black mb-3 uppercase italic tracking-tighter">Initialize Codespace</h4>
                              <p className="text-[11px] text-zinc-500 font-black uppercase mb-8 leading-tight">Secure virtual environment for rapid operational development.</p>
                              <button className="bg-black text-white px-10 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-1 active:translate-y-1 active:shadow-none">
                                Launch Environment
                              </button>
                           </div>

                           <div className="border-[3px] border-black bg-white p-10 flex flex-col items-center text-center group hover:bg-zinc-50 transition-all shadow-[10px_10px_0px_0px_rgba(220,38,38,1)] relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-16 h-16 bg-black/5 -rotate-45 translate-x-8 -translate-y-8"></div>
                              <div className="w-20 h-20 bg-red-600 border-[3px] border-black flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <UserPlus className="w-10 h-10 text-white group-hover:rotate-12 transition-transform" />
                              </div>
                              <h4 className="text-lg font-black text-black mb-3 uppercase italic tracking-tighter">Enlist Collaborators</h4>
                              <p className="text-[11px] text-zinc-500 font-black uppercase mb-8 leading-tight">Invite authorized operators to contribute to this secure vault.</p>
                              <button className="bg-white text-black border-[3px] border-black px-10 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-[6px_6px_0px_0px_rgba(220,38,38,0.3)] active:translate-x-1 active:translate-y-1 active:shadow-none">
                                Invite Personnel
                              </button>
                           </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Breadcrumbs */}
                        {currentPath !== undefined && (
                          <div className="bg-[#0a0a0a] border-b-[3px] border-black px-6 py-2.5 flex items-center gap-2 text-[10px] font-bold">
                            <div className="flex items-center gap-1.5 text-zinc-500 font-outfit uppercase tracking-tighter">
                              <FolderIcon className="w-3.5 h-3.5" />
                              <button onClick={() => setCurrentPath('')} className="hover:text-red-500 transition-colors">{repoName}</button>
                            </div>
                            {currentPath.split('/').filter(Boolean).map((part, i, arr) => (
                              <React.Fragment key={i}>
                                <span className="text-zinc-800">/</span>
                                <button 
                                  onClick={() => setCurrentPath(arr.slice(0, i + 1).join('/') + '/')}
                                  className={`font-outfit uppercase tracking-tighter transition-colors ${i === arr.length - 1 ? 'text-zinc-300' : 'text-zinc-500 hover:text-red-500'}`}
                                >
                                  {part}
                                </button>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                        
                        <div className="divide-y divide-zinc-800/40 border-x-[3px] border-b-[3px] border-black bg-[#0d1117]/40">
                          {(() => {
                            // Folder Logic
                            const items = new Map<string, { type: 'file' | 'folder', data?: any }>();
                            
                            files.forEach(file => {
                              const relativePath = file.path.startsWith(currentPath || '') 
                                ? file.path.slice((currentPath || '').length) 
                                : null;
                              
                              if (relativePath) {
                                const parts = relativePath.split('/');
                                if (parts.length > 1) {
                                  const folderName = parts[0];
                                  const existing = items.get(folderName);
                                  // Update folder with latest commit if this file is newer
                                  if (!existing || (file.lastCommitTimestamp > (existing.data?.lastCommitTimestamp || ''))) {
                                    items.set(folderName, { type: 'folder', data: file });
                                  }
                                } else if (parts.length === 1 && parts[0] !== '') {
                                  items.set(parts[0], { type: 'file', data: file });
                                }
                              }
                            });

                            const sortedItems = Array.from(items.entries()).sort((a, b) => {
                              // Always folders first, then files
                              if (a[1].type !== b[1].type) return a[1].type === 'folder' ? -1 : 1;
                              // Then sort alphabetically (Ascending)
                              return a[0].localeCompare(b[0], undefined, { sensitivity: 'base', numeric: true });
                            });

                            return sortedItems.map(([name, item]) => {
                              if (item.type === 'folder') {
                                return (
                                  <div 
                                    key={name} 
                                    onClick={() => setCurrentPath((currentPath || '') + name + '/')}
                                    className="flex items-center px-6 py-2.5 hover:bg-white/5 group transition-all cursor-pointer border-l-[3px] border-l-transparent hover:border-l-red-600"
                                  >
                                    <div className="w-1/3 flex items-center">
                                      <FolderIcon className="w-4 h-4 text-zinc-500 mr-3 group-hover:text-red-500 transition-colors" />
                                      <span className="text-[13px] font-bold text-white transition-colors truncate font-outfit group-hover:text-red-500">
                                        {name}
                                      </span>
                                    </div>
                                    <div className="flex-1 px-4 truncate">
                                      <span className="text-[11px] font-medium text-zinc-500 opacity-60 group-hover:opacity-100 transition-all italic">
                                        {item.data?.lastCommitMessage || 'directory_access_granted'}
                                      </span>
                                    </div>
                                    <div className="w-32 text-right">
                                      <span className="text-[10px] font-bold text-zinc-600 font-outfit uppercase">
                                        {item.data ? format(new Date(item.data.lastCommitTimestamp), 'MMM d, yyyy') : '--'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }

                              const file = item.data;
                              return (
                                <div key={file.id} className="flex items-center px-6 py-2.5 hover:bg-white/5 group transition-all cursor-pointer border-l-[3px] border-l-transparent hover:border-l-red-600">
                                  <div className="w-1/3 flex items-center">
                                    <FileIcon className="w-4 h-4 text-zinc-500 mr-3 group-hover:text-red-500 transition-colors" />
                                    <Link 
                                      to={`/${username}/${repoName}/blob/${encodeURIComponent(currentBranchName)}/${file.path}`} 
                                      className="text-[13px] font-bold text-white transition-colors truncate font-outfit group-hover:text-red-500"
                                    >
                                      {name}
                                    </Link>
                                  </div>
                                  <div className="flex-1 px-4 truncate">
                                    <span className="text-[11px] font-medium text-zinc-500 opacity-60 group-hover:opacity-100 transition-all">
                                      {file.lastCommitMessage}
                                    </span>
                                  </div>
                                  <div className="w-32 text-right">
                                    <span className="text-[10px] font-bold text-zinc-500 font-outfit">
                                      {format(new Date(file.lastCommitTimestamp), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {hasMoreFiles && (
                    <div className="bg-zinc-900/30 border-t border-zinc-800 p-4 text-center">
                      <button 
                        onClick={loadMoreFiles}
                        disabled={loadingMore}
                        className="text-xs font-bold text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                      >
                        {loadingMore ? 'Loading more files...' : 'Load more files...'}
                      </button>
                    </div>
                  )}
                </div>

                {/* README */}
                {readmeFile && (
                  <div className="neo-brutal-card mt-10 !shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-xs font-bold text-white">
                        <Book className="w-4.5 h-4.5 text-red-600" /> README.md
                      </div>
                      {user && user.id === repo.ownerId && (
                        <Link 
                          to={`/${username}/${repoName}/edit/${encodeURIComponent(currentBranchName)}/${readmeFile.path}`} 
                          className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                    <div className="p-6 md:p-8">
                      <MarkdownViewer content={readmeFile.content} />
                    </div>
                  </div>
                )}
              </div>

               {/* Sidebar Info */}
              <div className="w-full lg:w-80 space-y-10">
                <div className="border-b border-zinc-900 pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-zinc-400">About</h3>
                    {user && user.id === repo.ownerId && (
                      <button 
                        onClick={() => {
                          setIsEditingAbout(true);
                          setEditAboutText(repo.description || '');
                          setEditWebsiteUrl(repo.websiteUrl || '');
                        }}
                        className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-8">{repo.description || 'No description provided.'}</p>
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-zinc-400">Topics</h3>
                      {user?.id === repo.ownerId && (
                        <button onClick={handleSaveTopics} className="text-xs text-zinc-500 hover:text-red-500">
                          Edit
                        </button>
                      )}
                    </div>
                    {topics.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {topics.map((topic: any) => (
                          <span key={topic.id || topic.name} className="inline-flex items-center gap-1 bg-red-600 text-white px-2 py-1 text-[10px] font-black border-2 border-black">
                            <Hash className="w-3 h-3" />
                            {topic.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-600 italic">No topics yet</p>
                    )}
                  </div>
                  {repo.websiteUrl && (
                    <a 
                      href={repo.websiteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors mb-6 text-sm group"
                    >
                      <Globe className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span className="underline">{repo.websiteUrl}</span>
                    </a>
                  )}
                  <div className="space-y-4 text-xs font-bold text-zinc-400">
                    <div className="flex items-center gap-3 hover:text-white cursor-pointer transition-colors group">
                      <Book className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform"/> Readme
                    </div>
                    <div className="flex items-center gap-3 hover:text-white cursor-pointer transition-colors group">
                      <Activity className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform"/> Activity
                    </div>
                    <div className="flex items-center gap-3 hover:text-white cursor-pointer transition-colors group">
                      <Star className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform"/> {repo.starCount || 0} stars
                    </div>
                  </div>
                </div>

                <div className="border-b border-zinc-900 pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-zinc-400">Contributors</h3>
                    <span className="text-[10px] font-black text-zinc-600">{contributors.length}</span>
                  </div>
                  <div className="space-y-3">
                    {contributors.map((contributor: any) => (
                      <Link
                        key={contributor.username}
                        to={`/${contributor.username}`}
                        className="flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {contributor.avatarUrl ? (
                            <img
                              src={contributor.avatarUrl}
                              alt={contributor.username}
                              className="w-9 h-9 border-[3px] border-black object-cover shadow-[3px_3px_0px_0px_rgba(220,38,38,1)]"
                            />
                          ) : (
                            <div className="w-9 h-9 bg-red-600 border-[3px] border-black flex items-center justify-center text-xs font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                              {contributor.username?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-black text-zinc-200 truncate group-hover:text-red-500 transition-colors">
                            {contributor.username}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-zinc-600">
                          {contributor.count || 0}
                        </span>
                        {contributor.role === 'collaborator' && (
                          <span className="text-[9px] font-black text-red-600 uppercase">collab</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
                
                {(releases.length > 0 || tags.length > 0) && (
                  <div className="border-b border-zinc-900 pb-8">
                    {releases.length > 0 && (
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Latest release</h3>
                          <Link to={`/${username}/${repoName}/releases`} className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
                            View all
                          </Link>
                        </div>
                        <Link
                          to={`/${username}/${repoName}/releases/${encodeURIComponent(releases[0].tagName)}`}
                          className="group block border-[3px] border-black bg-white text-black shadow-[7px_7px_0px_0px_rgba(220,38,38,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] transition-all overflow-hidden"
                        >
                          <div className="bg-red-600 border-b-[3px] border-black px-4 py-3 relative overflow-hidden">
                            <div className="absolute inset-y-0 right-0 w-28 bg-black/10 -skew-x-[35deg] translate-x-8"></div>
                            <div className="relative flex items-center gap-2 min-w-0">
                              <Package className="w-4 h-4 text-white flex-shrink-0" />
                              <span className="text-sm font-black text-white italic truncate">{releases[0].title}</span>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="bg-black text-white px-2 py-1 text-[10px] font-black font-mono">{releases[0].tagName}</span>
                              <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">latest</span>
                            </div>
                            <p className="text-[10px] font-bold text-zinc-600">
                              {releases[0].publishedAt ? formatDistanceToNow(new Date(releases[0].publishedAt), { addSuffix: true }) : 'Draft'}
                              {` / ${releases[0].assets?.length || 0} ${(releases[0].assets?.length || 0) === 1 ? 'asset' : 'assets'}`}
                            </p>
                          </div>
                        </Link>
                      </div>
                    )}

                    {tags.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Latest tag</h3>
                          <Link to={`/${username}/${repoName}/tags`} className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
                            View all
                          </Link>
                        </div>
                        <Link
                          to={`/${username}/${repoName}/tags/${encodeURIComponent(tags[0].name)}`}
                          className="group flex items-center justify-between gap-3 border-[3px] border-black bg-white text-black p-4 shadow-[7px_7px_0px_0px_rgba(220,38,38,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] transition-all"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="w-7 h-7 bg-black text-white flex items-center justify-center flex-shrink-0">
                              <TagIcon className="w-4 h-4 text-red-600" />
                            </span>
                            <span className="font-mono font-black text-black truncate">{tags[0].name}</span>
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500 flex-shrink-0">
                            {tags[0].createdAt ? formatDistanceToNow(new Date(tags[0].createdAt), { addSuffix: true }) : 'recently'}
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <h3 className="text-sm font-bold text-zinc-400 mb-4">Languages</h3>
                  {(() => {
                    // Calculate language breakdown from files
                    const langMap = new Map<string, number>();
                    const extToLang: { [key: string]: string } = {
                      'ts': 'TypeScript',
                      'tsx': 'TypeScript',
                      'js': 'JavaScript',
                      'jsx': 'JavaScript',
                      'py': 'Python',
                      'java': 'Java',
                      'cpp': 'C++',
                      'c': 'C',
                      'html': 'HTML',
                      'css': 'CSS',
                      'scss': 'SCSS',
                      'json': 'JSON',
                      'yaml': 'YAML',
                      'yml': 'YAML',
                      'md': 'Markdown',
                      'sql': 'SQL',
                      'go': 'Go',
                      'rb': 'Ruby',
                      'php': 'PHP',
                    };

                    files.forEach(file => {
                      const ext = file.path.split('.').pop()?.toLowerCase() || 'unknown';
                      const lang = extToLang[ext] || (ext.charAt(0).toUpperCase() + ext.slice(1));
                      langMap.set(lang, (langMap.get(lang) || 0) + 1);
                    });

                    const total = files.length;
                    const sorted = Array.from(langMap.entries())
                      .sort((a, b) => b[1] - a[1]); // Show ALL languages

                    return (
                      <div className="space-y-4">
                        {sorted.length > 0 ? (
                          <>
                            <div className="w-full bg-zinc-900 h-2 mb-4 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              {sorted.map(([lang, count]) => (
                                <div
                                  key={lang}
                                  className="h-full inline-block"
                                  style={{
                                    width: `${(count / total) * 100}%`,
                                    backgroundColor: languageColors[lang] || '#dc2626',
                                    boxShadow: `0 0 10px ${languageColors[lang] || '#dc2626'}44`
                                  }}
                                />
                              ))}
                            </div>
                            {sorted.map(([lang, count]) => (
                              <div key={lang} className="text-xs font-bold text-white flex items-center justify-between">
                                <span className="flex items-center gap-2.5">
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full" 
                                    style={{ backgroundColor: languageColors[lang] || '#dc2626' }}
                                  /> {lang}
                                </span>
                                <span className="text-zinc-500 font-medium">{((count / total) * 100).toFixed(1)}%</span>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest italic">
                            No languages detected
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
            </div>
          </div>
          } />
          
          <Route path="/upload/:branch" element={
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest">{username} / {repoName} /</span>
                <span className="text-white font-black text-xs uppercase italic -skew-x-12">upload_files</span>
              </div>

              {/* Drag & Drop Zone */}
              <div className="border-[3px] border-black bg-white shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] overflow-hidden">
                <div className="bg-red-600 border-b-[3px] border-black px-6 py-4 flex items-center justify-between">
                  <h2 className="text-[10px] font-black text-white uppercase italic tracking-widest">Vault_Ingestion_Protocol</h2>
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-black"></div>
                    <div className="w-1.5 h-1.5 bg-black/40"></div>
                  </div>
                </div>
                <div 
                  className={`p-16 flex flex-col items-center justify-center border-4 border-dashed m-8 bg-zinc-50 group transition-all cursor-pointer relative ${isDragging ? 'border-red-600 bg-red-50' : 'border-zinc-200 hover:border-red-600/30 hover:bg-red-50/10'}`}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    multiple 
                    // @ts-ignore - support folder selection
                    webkitdirectory=""
                    onChange={handleFileChange}
                  />
                  {isAnalyzing ? (
                    <div className="p-20 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 border-[4px] border-zinc-200 border-t-red-600 rounded-full animate-spin mb-6"></div>
                      <h3 className="text-lg font-black text-black uppercase italic -skew-x-6 mb-2">Deep Scanning Local Tree...</h3>
                      <p className="text-xs font-black text-zinc-500 uppercase tracking-widest animate-pulse">Detected {analyzedCount} items so far</p>
                    </div>
                  ) : uploadFiles.length > 0 ? (
                    <div className="w-full max-w-md space-y-4 py-8">
                      <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-black text-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
                          <Activity className="w-6 h-6 animate-pulse text-red-500" />
                        </div>
                        <div className="text-left">
                          <span className="block text-sm font-black text-black uppercase italic -skew-x-6">
                            {uploadFiles.length >= 20 ? 'Vault Limit Reached' : 'Ingestion Analysis Active'}
                          </span>
                          <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                            {uploadFiles.length} / 20 items detected in local_tree
                          </span>
                        </div>
                      </div>

                      {uploadFiles.length >= 20 && (
                        <div className="bg-red-50 border-2 border-red-600 p-4 mb-6 animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-red-600 shrink-0" />
                            <div className="text-left">
                              <p className="text-[10px] font-black text-red-600 uppercase tracking-tight leading-tight">Institutional_Security_Cap</p>
                              <p className="text-[9px] font-bold text-red-900 mt-1 leading-relaxed">
                                Bulk ingestion is limited to 20 files per session. System directories (node_modules, .git) are automatically filtered for platform integrity.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Language Breakdown */}
                      <div className="grid grid-cols-2 gap-2 mb-6">
                        {(() => {
                          const stats: Record<string, number> = {};
                          uploadFiles.forEach(f => {
                            const ext = f.path.split('.').pop()?.toLowerCase() || 'text';
                            stats[ext] = (stats[ext] || 0) + 1;
                          });
                          return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([ext, count]) => (
                            <div key={ext} className="bg-white border border-zinc-200 p-2 flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase text-zinc-500">{ext}</span>
                              <span className="text-[10px] font-black text-black italic">{(count / uploadFiles.length * 100).toFixed(0)}%</span>
                            </div>
                          ));
                        })()}
                      </div>
                      
                      {loading && (
                        <div className="space-y-2 mb-6">
                          <div className="flex justify-between text-[9px] font-black text-red-600 uppercase italic">
                            <span>Uploading synchronization_stream...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-zinc-200 h-1.5 relative overflow-hidden border border-zinc-300">
                            <div 
                              className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-300 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <div className="max-h-40 overflow-y-auto space-y-2 border-t border-zinc-200 pt-4 px-2">
                        {uploadFiles.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px] font-bold text-zinc-500 bg-white border border-zinc-100 p-2">
                            <span className="truncate flex-1 font-mono text-black/60">{item.path}</span>
                            <span className="ml-2">{(item.file.size / 1024).toFixed(1)} KB</span>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setUploadFiles([]); }}
                        className="text-[9px] font-black text-red-600 uppercase hover:underline"
                      >
                        Clear all files
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-black text-white flex items-center justify-center mb-6 shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] group-hover:scale-110 transition-transform">
                        <Upload className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-black text-black uppercase italic -skew-x-6 mb-2">Drag files here to add them to your vault</h3>
                      <p className="text-xs font-black text-zinc-500 uppercase tracking-tighter">Or <span className="text-red-600 underline">choose your files</span> from local storage</p>
                    </>
                  )}
                </div>
              </div>

              {/* Commit Changes Section */}
              <div className="border-[3px] border-black bg-[#121212] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <div className="bg-zinc-900 border-b-[3px] border-black px-8 py-6 flex items-center gap-6">
                   <div className="w-12 h-12 bg-red-600 border-2 border-black flex items-center justify-center text-white font-black italic -rotate-3 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                     <img src={user?.imageUrl} className="w-full h-full object-cover" />
                   </div>
                   <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Commit_Metadata</h3>
                </div>
                <div className="p-10 space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Summary</label>
                    <input 
                      type="text" 
                      placeholder="Operational summary is required..."
                      required
                      value={commitSummary}
                      onChange={(e) => setCommitSummary(e.target.value)}
                      className="w-full bg-black border-2 border-zinc-800 p-4 text-sm text-white font-bold focus:border-red-600 outline-none transition-colors shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Description</label>
                    <textarea 
                      placeholder="Add an optional extended description..."
                      rows={4}
                      value={commitDescription}
                      onChange={(e) => setCommitDescription(e.target.value)}
                      className="w-full bg-black border-2 border-zinc-800 p-6 text-sm text-white font-medium focus:border-red-600 outline-none transition-colors shadow-inner resize-none"
                    />
                  </div>
                  
                  <div className="pt-6 border-t border-zinc-900 space-y-6">
                    <div className="flex items-center gap-4 group cursor-pointer">
                      <div className="w-5 h-5 border-2 border-red-600 bg-red-600/10 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-red-600"></div>
                      </div>
                      <span className="text-xs font-black text-white uppercase tracking-tighter">Commit directly to the <span className="bg-zinc-800 px-2 py-0.5 font-mono text-[10px]">main</span> branch.</span>
                    </div>
                    <div className="flex items-center gap-4 group cursor-pointer opacity-40">
                      <div className="w-5 h-5 border-2 border-zinc-800 flex items-center justify-center"></div>
                      <span className="text-xs font-black text-zinc-500 uppercase tracking-tighter">Create a new branch for this commit and start a pull request.</span>
                    </div>
                  </div>

                  <div className="pt-8 flex gap-4">
                    <button 
                      onClick={() => {
                        if (!commitSummary.trim()) {
                          alert("System Error: Commit summary is mandatory for operational integrity.");
                          return;
                        }
                        handleUploadSubmit();
                      }}
                      disabled={uploadFiles.length === 0 || loading}
                      className="bg-red-600 text-white px-10 py-4 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all border-b-4 border-r-4 border-black active:translate-x-1 active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processing...' : 'Commit Changes'}
                    </button>
                    <button 
                      onClick={() => navigate(`/${username}/${repoName}`)}
                      className="text-xs font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors px-6"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          } />
          
          <Route path="/new/:branch" element={
            <div className="neo-brutal-card">
              <div className="bg-zinc-900/50 border-b border-zinc-800 px-6 py-4">
                <h2 className="text-[10px] font-bold text-white">Create a new file</h2>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const path = (form.elements.namedItem('path') as HTMLInputElement).value;
                const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value;
                const message = (form.elements.namedItem('message') as HTMLInputElement).value;
                
                if (!message.trim()) { alert("Commit message required."); return; }

                const token = await getToken();
                const res = await fetch(`/api/repos/${username}/${repoName}/files`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ path, content, message, branch: currentBranchName })
                });
                
                if (res.ok) {
                  window.location.href = `/${username}/${repoName}`;
                }
              }}>
                <div className="p-6 border-b border-zinc-900">
                  <input 
                    name="path"
                    type="text" 
                    placeholder="Name your file..." 
                    required
                    className="w-full md:w-1/2 bg-black border border-zinc-800 px-4 py-2 text-sm text-white focus:border-red-600 outline-none transition-colors"
                  />
                </div>
                <div className="p-0">
                  <textarea 
                    name="content"
                    placeholder="Enter file content here" 
                    rows={16}
                    className="w-full bg-[#080808] px-6 py-6 text-white focus:outline-none font-mono text-sm resize-y"
                  ></textarea>
                </div>
                <div className="bg-zinc-900/30 border-t border-zinc-800 p-8">
                  <h3 className="text-[10px] font-bold text-zinc-500 mb-4">Commit changes</h3>
                  <div className="mb-6">
                    <input 
                      name="message"
                      type="text" 
                      required
                      placeholder="Mandatory commit message" 
                      className="w-full bg-black border border-zinc-800 px-4 py-2 text-sm text-white focus:border-red-600 outline-none transition-colors"
                    />
                  </div>
                  <button type="submit" className="neo-brutal-button">
                    Commit changes
                  </button>
                </div>
              </form>
            </div>
          } />

          <Route path="/edit/:branch/*" element={
            <div className="border-[3px] border-black bg-[#121212] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              {(() => {
                const filePath = location.pathname.split('/edit/')[1]?.split('/').slice(1).join('/');
                const file = files.find(f => f.path === filePath);
                
                if (!file) return <div className="p-24 text-center text-zinc-500 font-black uppercase italic tracking-tighter">Operational context lost: File not found.</div>;

                return (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value;
                    const message = (form.elements.namedItem('message') as HTMLInputElement).value;
                    
                    if (!message.trim()) { alert("Commit message required."); return; }

                    const token = await getToken();
                    const res = await fetch(`/api/repos/${username}/${repoName}/files`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ path: file.path, content, message, branch: currentBranchName })
                    });
                    
                    if (res.ok) {
                      window.location.href = `/${username}/${repoName}/blob/${encodeURIComponent(currentBranchName)}/${file.path}`;
                    }
                  }}>
                    <div className="bg-zinc-900 border-b-[3px] border-black px-8 py-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                          <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                          <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-black text-white uppercase tracking-widest italic">
                          <Terminal className="w-4 h-4 text-red-600" />
                          Editing_Buffer: <span className="text-red-500">{file.path}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                         <button 
                          type="button"
                          onClick={() => navigate(-1)}
                          className="text-[10px] font-black text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
                        >
                          Abort_Changes
                        </button>
                      </div>
                    </div>
                    
                    <div className="relative group">
                      <div className="absolute top-4 right-8 z-10 text-[9px] font-black text-zinc-800 uppercase tracking-widest group-hover:text-red-600/20 transition-colors pointer-events-none">
                        nexus_editor_v1.0
                      </div>
                      <textarea 
                        name="content"
                        defaultValue={file.content}
                        placeholder="Enter system instructions..." 
                        spellCheck={false}
                        className="w-full bg-[#050505] px-10 py-10 text-zinc-300 focus:text-white focus:outline-none font-mono text-sm resize-y min-h-[500px] selection:bg-red-600/30 border-b-[3px] border-black"
                        style={{ lineHeight: '1.6' }}
                      ></textarea>
                    </div>

                    <div className="bg-zinc-900/50 p-10 border-t border-zinc-800/50">
                      <div className="flex flex-col lg:flex-row gap-10 items-end">
                        <div className="flex-1 w-full space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-red-600"></div>
                            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Commit_Metadata</h3>
                          </div>
                          <input 
                            name="message"
                            type="text" 
                            required
                            placeholder="Mandatory operational summary" 
                            className="w-full bg-black border-2 border-zinc-800 p-4 text-sm text-white font-bold focus:border-red-600 outline-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                          />
                        </div>
                        <button type="submit" className="bg-red-600 text-white px-12 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none whitespace-nowrap">
                          Deploy Changes
                        </button>
                      </div>
                    </div>
                  </form>
                );
              })()}
            </div>
          } />

          {/* ... Rest of routes following the same high-fidelity dark pattern ... */}
          <Route path="/blob/:branch/*" element={
            <div className="border-[4px] border-black bg-[#0d0d0d] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="bg-zinc-900 border-b-[4px] border-black px-10 py-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-black text-white uppercase tracking-[0.2em] italic">
                    <FileIcon className="w-4 h-4 text-red-600" />
                    Vault_Archive: <span className="text-red-500">{location.pathname.split('/blob/')[1]?.split('/').slice(1).join('/')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
              {user && user.id === repo.ownerId && (
                <div className="flex items-center bg-black border-2 border-zinc-800 px-4 py-2 gap-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <Link 
                        to={`/${username}/${repoName}/edit/${encodeURIComponent(currentBranchName)}/${location.pathname.split('/blob/')[1]?.split('/').slice(1).join('/')}`} 
                        className="flex items-center gap-2.5 text-[10px] font-black text-zinc-400 hover:text-white transition-colors uppercase tracking-widest group"
                      >
                        <Pencil className="w-3.5 h-3.5 text-red-600 group-hover:scale-110 transition-transform" />
                        Edit_File
                      </Link>
                      <div className="w-px h-4 bg-zinc-800"></div>
                      <button 
                        onClick={() => {
                          const filePath = location.pathname.split('/blob/')[1]?.split('/').slice(1).join('/');
                          setDeleteFilePath(filePath);
                          setDeleteCommitMsg('Delete file');
                          setShowDeleteConfirm(true);
                        }}
                        className="flex items-center gap-2.5 text-[10px] font-black text-zinc-400 hover:text-red-600 transition-colors uppercase tracking-widest group"
                      >
                        <Trash className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        Delete
                      </button>
                </div>
              )}
              {user && user.id === repo.ownerId && currentBranchName !== 'main' && (
                <button
                  onClick={handleCreatePullRequest}
                  className="bg-red-600 text-white px-4 py-2 text-[10px] font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  Open pull request
                </button>
              )}
                </div>
              </div>
              <div className="p-0 overflow-auto bg-[#050505] min-h-[600px]">
                {(() => {
                  const filePath = location.pathname.split('/blob/')[1]?.split('/').slice(1).join('/');
                  const file = files.find(f => f.path === filePath);
                  if (!file) return <div className="p-32 text-center text-zinc-700 font-black uppercase italic tracking-tighter text-2xl opacity-20">Operational failure: File stream severed.</div>;
                  
                  if (file.path.endsWith('.md')) {
                    return (
                      <div className="p-16 prose prose-invert max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-p:font-medium prose-p:text-zinc-400">
                        <MarkdownViewer content={file.content} />
                      </div>
                    );
                  }
                  
                  const ext = file.path.split('.').pop() || 'text';
                  const lang = Prism.languages[ext] ? ext : 'javascript';
                  const lines = file.content.split('\n');
                  
                  return (
                    <div className="relative flex">
                      {/* Line Numbers */}
                      <div className="bg-[#080808] border-r border-zinc-900 px-6 py-12 text-right select-none min-w-[80px]">
                        {lines.map((_, i) => (
                          <div key={i} className="text-[10px] font-bold text-zinc-700 leading-[1.6]">{i + 1}</div>
                        ))}
                      </div>
                      
                      {/* Code Area */}
                      <div className="flex-1 relative group">
                        <div className="absolute top-6 right-12 z-10 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                           <span className="text-[9px] font-black bg-red-600 text-white px-3 py-1.5 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{ext}</span>
                           <span className="text-[9px] font-black bg-white text-black px-3 py-1.5 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{(file.content.length / 1024).toFixed(1)} KB</span>
                        </div>
                        <pre className={`language-${lang} m-0 !bg-transparent !border-0 !p-12 !pt-12 !shadow-none selection:bg-red-600/30`}>
                          <code dangerouslySetInnerHTML={{ __html: Prism.highlight(file.content, Prism.languages[lang] || Prism.languages.javascript, lang) }} />
                        </pre>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          } />

           <Route path="/issues" element={
            <div className="neo-brutal-card overflow-hidden">
              <div className="bg-zinc-900/50 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-6 text-[10px] font-bold">
                  <span className="text-white flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-green-500" /> {issues.filter(i => i.status === 'open').length} Open
                  </span>
                  <span className="text-zinc-500 flex items-center gap-2 hover:text-white cursor-pointer transition-colors">
                    <CircleDot className="w-4 h-4" /> {issues.filter(i => i.status === 'closed').length} Closed
                  </span>
                </div>
                {user && (
                  <Link to={`/${username}/${repoName}/issues/new`} className="neo-brutal-button !py-1.5 !px-4">
                    New issue
                  </Link>
                )}
              </div>
              <div className="divide-y divide-zinc-900 bg-black">
                {issues.length === 0 ? (
                  <div className="p-24 text-center">
                    <CircleDot className="w-12 h-12 text-zinc-800 mx-auto mb-6" />
                    <h3 className="text-xl font-bold tracking-tight mb-2">Welcome to issues.</h3>
                    <p className="text-zinc-500 text-[10px] font-bold">Track bugs, features, and madness here.</p>
                  </div>
                ) : (
                  issues.map(issue => (
                    <div key={issue.id} className="flex items-start px-6 py-4 hover:bg-zinc-900/50 transition-all group">
                      <CircleDot className={`w-4 h-4 mt-1 mr-4 ${issue.status === 'open' ? 'text-green-500' : 'text-purple-500'}`} />
                      <div>
                        <Link to={`/${username}/${repoName}/issues/${issue.id}`} className="text-base font-bold text-zinc-200 group-hover:text-red-500 transition-colors">
                          {issue.title}
                        </Link>
                        <div className="text-[10px] font-bold text-zinc-600 mt-2">
                          #{issue.id.substring(0, 4)} opened by <span className="text-zinc-400">{issue.creatorUsername}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          } />

          <Route path="/issues/new" element={
            <NewIssue
              username={username}
              repoName={repoName}
              user={user}
              getToken={getToken}
            />
          } />

          <Route path="/issues/:issueId" element={
            <IssueDetail
              username={username}
              repoName={repoName}
              issues={issues}
              user={user}
              repo={repo}
              onRefresh={fetchRepoData}
            />
          } />

          <Route path="/pulls" element={
            <PullRequestsPanel
              username={username}
              repoName={repoName}
              repo={repo}
              user={user}
              getToken={getToken}
              pullRequests={pullRequests}
              currentBranchName={currentBranchName}
              defaultBranch={repoSettings?.defaultBranch || 'main'}
              onCreate={handleCreatePullRequest}
              onMerge={handleMergePullRequest}
            />
          } />

          <Route path="/insights" element={
            <div className="border-[3px] border-black bg-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] overflow-hidden">
              <div className="bg-red-600 border-b-[3px] border-black px-8 py-6 relative overflow-hidden">
                <div className="absolute inset-y-0 right-0 w-72 bg-black/10 -skew-x-[35deg] translate-x-16"></div>
                <h2 className="relative text-xl font-black text-white uppercase italic tracking-tight">Repository insights</h2>
                <p className="relative text-sm text-red-100 mt-2 font-semibold">Pulse, contributors, and growth signals</p>
              </div>
              <div className="p-8 bg-[#050505] grid gap-6 md:grid-cols-3">
                <div className="bg-white text-black border-[3px] border-black p-6 shadow-[7px_7px_0px_0px_rgba(220,38,38,1)]">
                  <h3 className="text-sm font-black mb-2">Commits</h3>
                  <p className="text-4xl font-black">{commits.length}</p>
                  <p className="text-xs font-bold text-zinc-500 mt-2">Total repository activity</p>
                </div>
                <div className="bg-white text-black border-[3px] border-black p-6 shadow-[7px_7px_0px_0px_rgba(220,38,38,1)]">
                  <h3 className="text-sm font-black mb-2">Contributors</h3>
                  <p className="text-4xl font-black">{new Set(commits.map((commit: any) => commit.authorUsername)).size || 1}</p>
                  <p className="text-xs font-bold text-zinc-500 mt-2">People with commits</p>
                </div>
                <div className="bg-white text-black border-[3px] border-black p-6 shadow-[7px_7px_0px_0px_rgba(220,38,38,1)]">
                  <h3 className="text-sm font-black mb-2">Tracked files</h3>
                  <p className="text-4xl font-black">{files.length}</p>
                  <p className="text-xs font-bold text-zinc-500 mt-2">{(files.reduce((sum, file) => sum + (file.content?.length || 0), 0) / 1024).toFixed(1)} KB content</p>
                </div>
                <div className="md:col-span-3 bg-[#080808] border-[3px] border-black p-6 shadow-[7px_7px_0px_0px_rgba(220,38,38,1)]">
                  <h3 className="text-sm font-black text-white mb-4">Recent pulse</h3>
                  <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1">
                    {Array.from({ length: 30 }).map((_, index) => {
                      const day = new Date();
                      day.setDate(day.getDate() - (29 - index));
                      const count = commits.filter((commit: any) => new Date(commit.timestamp).toDateString() === day.toDateString()).length;
                      return <div key={index} title={`${count} commits`} className={`h-8 border border-black ${count > 0 ? 'bg-red-600' : 'bg-zinc-900'}`}></div>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          } />

          <Route path="/wiki/*" element={
            <WikiPanel
              username={username}
              repoName={repoName}
              wikiPages={wikiPages}
              user={user}
              repo={repo}
              getToken={getToken}
              onCreate={() => setIsCreatingWikiPage(true)}
              onChanged={() => window.location.reload()}
            />
          } />

          {/* ... Rest of the sub-pages like settings follow the same theme ... */}
          <Route path="/settings" element={
            user?.id !== repo.ownerId ? (
              <Navigate to={`/${username}/${repoName}`} replace />
            ) : (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold tracking-tight mb-8">Settings</h2>

              <div className="border-4 border-black bg-white text-black p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-black">Branch protection</h3>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={Boolean(repoSettings?.protectMainBranch)}
                      onChange={(e) => handleSaveRepoSettings({ ...repoSettings, protectMainBranch: e.target.checked })}
                    />
                    Protect main branch
                  </label>
                  <label className="flex items-center gap-3 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={Boolean(repoSettings?.requirePullRequest)}
                      onChange={(e) => handleSaveRepoSettings({ ...repoSettings, requirePullRequest: e.target.checked })}
                    />
                    Require pull requests before merge
                  </label>
                  <label className="block text-sm font-bold">
                    Required review count
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={repoSettings?.requiredReviewCount || 0}
                      onChange={(e) => handleSaveRepoSettings({ ...repoSettings, requiredReviewCount: Number(e.target.value) })}
                      className="mt-2 block w-32 border-2 border-black px-3 py-2 bg-white"
                    />
                  </label>
                </div>
              </div>

              <RepositoryAdminPanel
                username={username}
                repoName={repoName}
                branches={branches}
                settings={repoSettings}
                repo={repo}
                getToken={getToken}
                onRefresh={() => window.location.reload()}
                onRepoUpdated={(updatedRepo: any) => setRepo(updatedRepo)}
              />
              
              <div className="border-4 border-red-600/20 bg-red-600/[0.02] p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,0.1)]">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-red-500 text-sm font-bold mb-2">Danger Zone</h3>
                    <h4 className="font-bold text-white mb-1">Delete this repository</h4>
                    <p className="text-xs text-zinc-500">Once you delete a repository, there is no going back. Proceed with caution.</p>
                  </div>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-transparent border-2 border-red-600 text-red-600 font-bold text-[10px] py-2 px-6 hover:bg-red-600 hover:text-white transition-all"
                  >
                    Delete repository
                  </button>
                </div>
                {showDeleteConfirm && (
                  <div className="mt-8 pt-8 border-t border-red-600/20 flex flex-col md:flex-row items-center justify-between gap-4">
                    <span className="text-[10px] font-bold text-red-500 animate-pulse">Are you absolutely certain?</span>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={async () => {
                          const token = await getToken();
                          const res = await fetch(`/api/repos/${username}/${repoName}`, { 
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (res.ok) {
                            window.location.href = `/${username}`;
                          }
                        }}
                        className="bg-red-600 text-white font-bold text-[10px] py-2 px-6 border-b-4 border-r-4 border-black transition-all"
                      >
                        Yes, delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )
          } />
          <Route path="/commits" element={
            <div className="border-[4px] border-black bg-[#0d0d0d] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="bg-zinc-900 border-b-[4px] border-black px-10 py-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)] animate-pulse"></div>
                  <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em] italic">Operational_Logs_Archive</h2>
                </div>
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  Total_Entries: <span className="text-red-500">{commits.length}</span>
                </div>
              </div>
              <div className="divide-y-4 divide-black bg-black">
                {commits.length === 0 ? (
                  <div className="p-32 text-center">
                    <Activity className="w-16 h-16 text-zinc-800 mx-auto mb-8 animate-pulse" />
                    <h3 className="text-2xl font-black text-white uppercase italic -skew-x-6 mb-4">No operational history found.</h3>
                    <p className="text-zinc-600 text-[11px] font-black uppercase tracking-widest">The vault remains in its initial state.</p>
                  </div>
                ) : (
                  commits.map((commit, i) => (
                    <Link 
                      key={commit.id} 
                      to={`/${username}/${repoName}/commits/${commit.id}`}
                      className="group relative flex items-center gap-8 px-10 py-8 hover:bg-zinc-900/40 transition-all border-l-[10px] border-transparent hover:border-red-600 cursor-pointer"
                    >
                      <div className="w-12 h-12 bg-black border-2 border-zinc-800 flex items-center justify-center text-white font-black italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex-shrink-0 group-hover:border-red-600 transition-colors">
                        <img src={commit.authorAvatarUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-zinc-200 group-hover:text-red-500 transition-colors truncate">{commit.message}</span>
                          <div className="hidden md:flex items-center gap-2 bg-zinc-900 px-3 py-1 border border-zinc-800">
                            <Code className="w-3 h-3 text-red-600" />
                            <span className="text-[9px] font-mono text-zinc-500">{commit.id.substring(0, 7)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-[10px] font-black text-zinc-600 uppercase tracking-tighter">
                          <span>Operator: <span className="text-zinc-400">{commit.authorUsername}</span></span>
                          <span className="w-1 h-1 bg-zinc-800 rounded-full"></span>
                          <span>Timestamp: <span className="text-zinc-400">{format(new Date(commit.timestamp), 'MMM d, yyyy · HH:mm')}</span></span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          } />

          <Route path="/commits/:commitId" element={
            <CommitDiffPage username={username!} repoName={repoName!} commits={commits} />
          } />

          <Route path="/tags" element={
            <div className="max-w-5xl">
              <div className="border-[3px] border-black bg-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]">
                <div className="bg-red-600 border-b-[3px] border-black px-8 py-6 flex items-center justify-between relative overflow-hidden">
                  <div className="absolute inset-y-0 right-0 w-72 bg-black/10 -skew-x-[35deg] translate-x-16"></div>
                  <div className="relative">
                    <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Tags</h2>
                    <p className="text-sm text-red-100 mt-2 font-semibold">Version releases and git tags for this repository</p>
                  </div>
                  {user?.id === repo?.ownerId && (
                    <button 
                      onClick={() => setIsCreatingTag(true)}
                      className="relative bg-white text-black px-6 py-3 text-[11px] font-black border-[3px] border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all"
                    >
                      Create Tag
                    </button>
                  )}
                </div>
                <div className="p-8 bg-[#050505]">
                  {tags.length > 0 ? (
                    <div className="space-y-4">
                      {Array.from(new Map(tags.map((tag: any) => [tag.id, tag])).values()).map((tag: any) => {
                        // Strip HTML tags and markdown syntax from preview
                        let previewText = tag.message?.replace(/<[^>]*>/g, '') || '';
                        // Remove markdown headers (#, ##, etc)
                        previewText = previewText.replace(/^#+\s+/gm, '');
                        // Remove markdown bold/italic
                        previewText = previewText.replace(/[*_]{1,2}/g, '');
                        // Remove markdown links
                        previewText = previewText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
                        // Trim and limit to 150 chars
                        previewText = previewText.trim().slice(0, 150);
                        
                        return (
                          <Link
                            key={tag.id}
                            to={`/${username}/${repoName}/tags/${tag.name}`}
                            className="border-[3px] border-black bg-white p-6 group cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 shadow-[7px_7px_0px_0px_rgba(220,38,38,1)] hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] transition-all block no-underline text-black"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center">
                                    <TagIcon className="w-4 h-4 text-red-600" />
                                  </span>
                                  <h3 className="text-base font-black text-black font-mono">{tag.name}</h3>
                                </div>
                                {previewText && (
                                  <p className="text-sm text-zinc-700 mb-3 line-clamp-2 font-medium">{previewText}</p>
                                )}
                                <p className="text-xs text-zinc-500 font-semibold">
                                  Created {tag.createdAt ? format(new Date(tag.createdAt), 'MMM dd, yyyy') : 'recently'}
                                  {tag.creator && ` by ${tag.creator.username}`}
                                </p>
                              </div>
                              {user?.id === repo?.ownerId && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!confirm('Delete this tag?')) return;
                                    (async () => {
                                      try {
                                        const token = await getToken();
                                        const res = await fetch(`/api/repos/${username}/${repoName}/tags/${tag.id}`, {
                                          method: 'DELETE',
                                          headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        if (res.ok) {
                                          setTags(tags.filter((t: any) => t.id !== tag.id));
                                        }
                                      } catch (err) {
                                        console.error('Error deleting tag:', err);
                                      }
                                    })();
                                  }}
                                  className="p-2 text-zinc-500 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <TagIcon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-400 text-sm">No tags yet</p>
                        <p className="text-zinc-600 text-xs mt-2">Create a tag to mark release points in your repository history</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          } />

          <Route path="/tags/:tagName" element={
            <TagDetailView username={username!} repoName={repoName!} tags={tags} loading={loading} />
          } />

          <Route path="/releases" element={
            <div className="max-w-5xl">
              <div className="border-[3px] border-black bg-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]">
                <div className="bg-red-600 border-b-[3px] border-black px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden">
                  <div className="absolute inset-y-0 right-0 w-72 bg-black/10 -skew-x-[35deg] translate-x-16"></div>
                  <div className="relative">
                    <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Releases</h2>
                    <p className="text-sm text-red-100 mt-2 font-semibold">Versioned builds, notes, and downloadable binaries</p>
                  </div>
                  {user?.id === repo?.ownerId && (
                    <button
                      onClick={() => setIsCreatingRelease(true)}
                      className="relative bg-white text-black px-6 py-3 text-[11px] font-black border-[3px] border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all"
                    >
                      Create Release
                    </button>
                  )}
                </div>
                <div className="p-8 bg-[#050505]">
                  {releases.length > 0 ? (
                    <div className="space-y-6">
                      {releases.map((release: any) => {
                        let previewText = release.body?.replace(/<[^>]*>/g, '') || '';
                        previewText = previewText.replace(/^#+\s+/gm, '');
                        previewText = previewText.replace(/[*_]{1,2}/g, '');
                        previewText = previewText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
                        previewText = previewText.trim().slice(0, 180);

                        return (
                        <Link
                          key={release.id}
                          to={`/${username}/${repoName}/releases/${encodeURIComponent(release.tagName)}`}
                          className="block border-[3px] border-black bg-white p-6 group hover:translate-x-0.5 hover:translate-y-0.5 shadow-[7px_7px_0px_0px_rgba(220,38,38,1)] hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] transition-all no-underline text-black"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3 mb-3">
                                <span
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate(`/${username}/${repoName}/tags/${encodeURIComponent(release.tagName)}`);
                                  }}
                                  className="inline-flex items-center gap-2 text-xs font-black text-red-600 hover:text-black transition-colors uppercase tracking-widest"
                                >
                                  <TagIcon className="w-4 h-4" />
                                  {release.tagName}
                                </span>
                                {release.isDraft && (
                                  <span className="border-2 border-black bg-zinc-100 px-2 py-1 text-[9px] font-black text-black uppercase tracking-widest">Draft</span>
                                )}
                                {release.isPrerelease && (
                                  <span className="border-2 border-black bg-red-600 px-2 py-1 text-[9px] font-black text-white uppercase tracking-widest">Pre-release</span>
                                )}
                              </div>
                              <h3 className="text-xl font-black text-black group-hover:text-red-600 uppercase tracking-tight mb-2 transition-colors">{release.title}</h3>
                              {previewText && (
                                <p className="text-sm text-zinc-700 mb-3 line-clamp-2 font-medium">{previewText}</p>
                              )}
                              <p className="text-xs text-zinc-500 font-semibold">
                                {release.publishedAt ? `Published ${formatDistanceToNow(new Date(release.publishedAt), { addSuffix: true })}` : 'Unpublished draft'}
                                {release.author?.username && ` by ${release.author.username}`}
                                <span className="mx-2 text-zinc-400">/</span>
                                {release.assets?.length || 0} {(release.assets?.length || 0) === 1 ? 'asset' : 'assets'}
                              </p>
                            </div>
                            {user?.id === repo?.ownerId && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteRelease(release.id);
                                }}
                                className="self-start p-2 text-zinc-500 hover:text-red-600 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                title="Delete release"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <Package className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-400 text-sm">No releases yet</p>
                        <p className="text-zinc-600 text-xs mt-2">Create a release to share production-ready versions of your code</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          } />
          
          <Route path="/releases/:releaseTag" element={
            <ReleaseDetailView username={username!} repoName={repoName!} releases={releases} loading={loading} />
          } />
        </Routes>

        {/* Delete File Modal */}
        {showDeleteConfirm && deleteFilePath && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d0d0d] border-2 border-zinc-800 max-w-md w-full p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-black text-white mb-2 uppercase tracking-tight">Delete file</h2>
              <p className="text-[12px] text-zinc-400 mb-6">You are about to delete:</p>
              <div className="bg-black px-4 py-3 border border-zinc-800 mb-6 text-[11px] font-mono text-zinc-300 break-all">
                {deleteFilePath}
              </div>
              
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-zinc-300 mb-2 uppercase tracking-widest">Commit message</label>
                <input
                  type="text"
                  value={deleteCommitMsg}
                  onChange={(e) => setDeleteCommitMsg(e.target.value)}
                  placeholder="Delete file"
                  className="w-full bg-[#080808] border border-zinc-800 px-4 py-2 text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                />
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteFilePath('');
                  }}
                  className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsDeletingFile(true);
                    try {
                      const token = await getToken();
                      const res = await fetch(`/api/repos/${username}/${repoName}/files/${encodeURIComponent(deleteFilePath)}`, { 
                        method: 'DELETE',
                        headers: { 
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ commitMessage: deleteCommitMsg })
                      });
                      if (res.ok) {
                        window.location.href = `/${username}/${repoName}`;
                      }
                    } finally {
                      setShowDeleteConfirm(false);
                      setIsDeletingFile(false);
                    }
                  }}
                  disabled={isDeletingFile}
                  className={`text-[11px] px-6 py-2 border-b-2 border-r-2 border-black font-bold uppercase tracking-widest transition-all ${isDeletingFile ? 'bg-red-600/50 text-white/50 cursor-wait border-black/50' : 'bg-red-600 text-white hover:bg-red-700'}`}
                >
                  {isDeletingFile ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit About Modal */}
        {isEditingAbout && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d0d0d] border-2 border-zinc-800 max-w-md w-full p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-black text-white mb-4 uppercase tracking-tight">Edit About</h2>
              
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-zinc-300 mb-2 uppercase tracking-widest">Description</label>
                <textarea
                  value={editAboutText}
                  onChange={(e) => setEditAboutText(e.target.value)}
                  placeholder="Add a description for your repository"
                  rows={4}
                  maxLength={255}
                  className="w-full bg-[#080808] border border-zinc-800 px-4 py-2 text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none resize-none"
                />
                <div className="text-[10px] text-zinc-500 mt-2">{editAboutText.length}/255</div>
              </div>

              <div className="mb-6">
                <label className="block text-[11px] font-bold text-zinc-300 mb-2 uppercase tracking-widest">Website URL</label>
                <input
                  type="url"
                  value={editWebsiteUrl}
                  onChange={(e) => setEditWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-[#080808] border border-zinc-800 px-4 py-2 text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                />
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setIsEditingAbout(false)}
                  className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsSavingAbout(true);
                    try {
                      const token = await getToken();
                      const res = await fetch(`/api/repos/${username}/${repoName}`, {
                        method: 'PATCH',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                          description: editAboutText,
                          websiteUrl: editWebsiteUrl
                        })
                      });
                      if (res.ok) {
                        const updatedRepo = await res.json();
                        setRepo(updatedRepo);
                        setIsEditingAbout(false);
                      } else {
                        alert('Failed to save description');
                      }
                    } catch (err) {
                      console.error('Error saving description:', err);
                      alert('Error saving description');
                    } finally {
                      setIsSavingAbout(false);
                    }
                  }}
                  disabled={isSavingAbout}
                  className={`text-[11px] px-6 py-2 border-b-2 border-r-2 border-black font-bold uppercase tracking-widest transition-all ${isSavingAbout ? 'bg-red-600/50 text-white/50 cursor-wait border-black/50' : 'bg-red-600 text-white hover:bg-red-700'}`}
                >
                  {isSavingAbout ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Tag Modal */}
        {isCreatingTag && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d0d0d] border-2 border-zinc-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-black text-white mb-6 uppercase tracking-tight">Create Tag</h2>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-2 uppercase tracking-widest">Tag Name</label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="v1.0.0"
                    className="w-full bg-[#080808] border border-zinc-800 px-4 py-2 text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-2 uppercase tracking-widest">Select Commit</label>
                  <select
                    value={selectedCommitForTag}
                    onChange={(e) => setSelectedCommitForTag(e.target.value)}
                    className="w-full bg-[#080808] border border-zinc-800 px-4 py-2 text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                  >
                    <option value="">Choose a commit...</option>
                    {commits.map((commit: any) => (
                      <option key={commit.id} value={commit.id}>
                        {commit.message} ({commit.id.slice(0, 7)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[11px] font-bold text-zinc-300 mb-3 uppercase tracking-widest">Release Notes (Markdown Supported)</label>
                <div className="grid grid-cols-2 gap-4 border-2 border-zinc-800 bg-[#080808]">
                  {/* Editor */}
                  <div className="border-r-2 border-zinc-800 p-4">
                    <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-widest font-bold">Editor</p>
                    <textarea
                      value={newTagMessage}
                      onChange={(e) => setNewTagMessage(e.target.value)}
                      placeholder="# Release Notes

## Features
- New feature 1
- New feature 2

## Bug Fixes
- Fixed issue 1
- Fixed issue 2

## Changelog
Add your changelog here..."
                      rows={12}
                      className="w-full bg-[#0a0a0a] border border-zinc-800 px-3 py-2 text-xs text-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none resize-none font-mono"
                    />
                  </div>

                  {/* Preview */}
                  <div className="p-4 overflow-y-auto">
                    <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-widest font-bold">Preview</p>
                    <div className="text-sm text-zinc-200 space-y-3">
                      {newTagMessage ? (
                        <MarkdownViewer content={newTagMessage} />
                      ) : (
                        <p className="text-zinc-600 text-xs italic">Markdown preview will appear here...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => {
                    setIsCreatingTag(false);
                    setNewTagName('');
                    setNewTagMessage('');
                    setSelectedCommitForTag('');
                  }}
                  className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newTagName || !selectedCommitForTag) {
                      alert('Please fill in all required fields');
                      return;
                    }
                    
                    // Check if tag name already exists
                    if (tags.some((t: any) => t.name === newTagName)) {
                      alert('A tag with this name already exists. Please choose another tag name.');
                      return;
                    }
                    
                    try {
                      const token = await getToken();
                      const res = await fetch(`/api/repos/${username}/${repoName}/tags`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          name: newTagName,
                          commitId: selectedCommitForTag,
                          message: newTagMessage || null
                        })
                      });
                      if (res.ok) {
                        const newTag = await res.json();
                        setTags([newTag, ...tags]);
                        setIsCreatingTag(false);
                        setNewTagName('');
                        setNewTagMessage('');
                        setSelectedCommitForTag('');
                        navigate(`/${username}/${repoName}/tags/${encodeURIComponent(newTag.name)}`);
                      } else {
                        alert('Failed to create tag');
                      }
                    } catch (err) {
                      console.error('Error creating tag:', err);
                      alert('Error creating tag');
                    }
                  }}
                  className="text-[11px] px-6 py-2 border-b-2 border-r-2 border-black font-bold uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all"
                >
                  Create Tag
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Release Modal */}
        {isCreatingRelease && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d0d0d] border-2 border-zinc-800 max-w-5xl w-full max-h-[92vh] overflow-y-auto p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start justify-between gap-6 mb-6">
                <div>
                  <h2 className="text-lg font-black text-white mb-2 uppercase tracking-tight">Create Release</h2>
                  <p className="text-xs text-zinc-500">Publish release notes and attach binaries stored in Supabase Storage.</p>
                </div>
                <button
                  onClick={() => {
                    setIsCreatingRelease(false);
                    resetReleaseForm();
                  }}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-2 uppercase tracking-widest">Tag</label>
                      <input
                        type="text"
                        list="release-tags"
                        value={newReleaseTag}
                        onChange={(e) => {
                          setNewReleaseTag(e.target.value);
                          if (!newReleaseTitle) setNewReleaseTitle(e.target.value);
                        }}
                        placeholder="v1.0.0"
                        className="w-full bg-[#080808] border border-zinc-800 px-4 py-2 text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                      />
                      <datalist id="release-tags">
                        {tags.map((tag: any) => (
                          <option key={tag.id} value={tag.name} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-2 uppercase tracking-widest">Target Commit</label>
                      <select
                        value={newReleaseCommit}
                        onChange={(e) => setNewReleaseCommit(e.target.value)}
                        className="w-full bg-[#080808] border border-zinc-800 px-4 py-2 text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                      >
                        <option value="">Latest commit / existing tag commit</option>
                        {commits.map((commit: any) => (
                          <option key={commit.id} value={commit.id}>
                            {commit.message} ({commit.id.slice(0, 7)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-2 uppercase tracking-widest">Release Title</label>
                    <input
                      type="text"
                      value={newReleaseTitle}
                      onChange={(e) => setNewReleaseTitle(e.target.value)}
                      placeholder="Release v1.0.0"
                      className="w-full bg-[#080808] border border-zinc-800 px-4 py-2 text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-3 uppercase tracking-widest">Release Notes</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-2 border-zinc-800 bg-[#080808]">
                      <div className="md:border-r-2 border-zinc-800 p-4">
                        <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-widest font-bold">Editor</p>
                        <textarea
                          value={newReleaseBody}
                          onChange={(e) => setNewReleaseBody(e.target.value)}
                          placeholder={"# What's Changed\n\n- Added production build\n- Fixed install flow\n\n## Checksums\nAttach binaries on the right."}
                          rows={14}
                          className="w-full bg-[#0a0a0a] border border-zinc-800 px-3 py-2 text-xs text-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none resize-none font-mono"
                        />
                      </div>
                      <div className="p-4 overflow-y-auto max-h-[430px]">
                        <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-widest font-bold">Preview</p>
                        {newReleaseBody ? (
                          <MarkdownViewer content={newReleaseBody} />
                        ) : (
                          <p className="text-zinc-600 text-xs italic">Markdown preview will appear here...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border-2 border-zinc-800 bg-[#080808]">
                    <div className="border-b-2 border-zinc-800 px-4 py-3">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-[0.25em]">Options</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newReleaseDraft}
                          onChange={(e) => setNewReleaseDraft(e.target.checked)}
                          className="mt-1 accent-red-600"
                        />
                        <span>
                          <span className="block text-xs font-bold text-white">Save as draft</span>
                          <span className="block text-[10px] text-zinc-500 mt-1">Hidden from normal release consumers until published.</span>
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newReleasePrerelease}
                          onChange={(e) => setNewReleasePrerelease(e.target.checked)}
                          className="mt-1 accent-red-600"
                        />
                        <span>
                          <span className="block text-xs font-bold text-white">Mark as pre-release</span>
                          <span className="block text-[10px] text-zinc-500 mt-1">Signals that this build is not the stable default.</span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="border-2 border-zinc-800 bg-[#080808]">
                    <div className="border-b-2 border-zinc-800 px-4 py-3 flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-[0.25em]">Binaries</h3>
                      <span className="text-[10px] font-black text-zinc-600">{newReleaseAssets.length}</span>
                    </div>
                    <div className="p-4 space-y-4">
                      <label
                        className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed px-4 py-8 cursor-pointer transition-colors ${
                          isDraggingReleaseAsset
                            ? 'border-red-600 bg-red-600/10'
                            : 'border-zinc-800 bg-black hover:border-red-600/60'
                        }`}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDraggingReleaseAsset(true);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = 'copy';
                          setIsDraggingReleaseAsset(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            setIsDraggingReleaseAsset(false);
                          }
                        }}
                        onDrop={handleReleaseAssetDrop}
                      >
                        <Upload className={`w-6 h-6 ${isDraggingReleaseAsset ? 'text-white' : 'text-red-600'}`} />
                        <span className="text-xs font-bold text-zinc-300 text-center">
                          {isDraggingReleaseAsset ? 'Drop binaries here' : 'Attach or drop release binaries'}
                        </span>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            addReleaseAssetFiles(files);
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>

                      {newReleaseAssets.length > 0 && (
                        <div className="divide-y divide-zinc-900 border border-zinc-900">
                          {newReleaseAssets.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="flex items-center gap-3 px-3 py-2 bg-black">
                              <FileArchive className="w-4 h-4 text-red-600 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-zinc-200 truncate">{file.name}</p>
                                <p className="text-[10px] text-zinc-600">{formatBytes(file.size)}</p>
                              </div>
                              <button
                                onClick={() => setNewReleaseAssets(prev => prev.filter((_, fileIndex) => fileIndex !== index))}
                                className="p-1 text-zinc-600 hover:text-red-500"
                                title="Remove asset"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 justify-end mt-8 pt-6 border-t border-zinc-800">
                <button
                  onClick={() => {
                    setIsCreatingRelease(false);
                    resetReleaseForm();
                  }}
                  className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRelease}
                  disabled={isSavingRelease}
                  className={`text-[11px] px-6 py-2 border-b-2 border-r-2 border-black font-bold uppercase tracking-widest transition-all ${isSavingRelease ? 'bg-red-600/50 text-white/50 cursor-wait' : 'bg-red-600 text-white hover:bg-red-700'}`}
                >
                  {isSavingRelease ? 'Publishing...' : newReleaseDraft ? 'Save Draft' : 'Publish Release'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isCreatingWikiPage && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white text-black border-[3px] border-black max-w-3xl w-full p-8 shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]">
              <h2 className="text-xl font-black mb-6">New wiki page</h2>
              <input
                value={newWikiTitle}
                onChange={(e) => setNewWikiTitle(e.target.value)}
                placeholder="Page title"
                className="w-full border-[3px] border-black px-4 py-3 mb-4 font-bold"
              />
              <textarea
                value={newWikiContent}
                onChange={(e) => setNewWikiContent(e.target.value)}
                placeholder="Write documentation in Markdown..."
                rows={12}
                className="w-full border-[3px] border-black px-4 py-3 mb-6 font-mono text-sm"
              />
              <div className="flex justify-end gap-4">
                <button onClick={() => setIsCreatingWikiPage(false)} className="text-sm font-black text-zinc-500">Cancel</button>
                <button onClick={handleCreateWikiPage} className="bg-red-600 text-white border-[3px] border-black px-6 py-3 text-sm font-black">
                  Create page
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
