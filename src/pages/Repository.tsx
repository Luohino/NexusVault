import React, { useEffect, useState } from 'react';
import { useParams, Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Book, Star, GitFork, Code, CircleDot, GitPullRequest, Settings, File as FileIcon, Folder as FolderIcon, GitBranch, ChevronDown, Tag, Activity, Eye, Pencil, Trash, Copy, Terminal, Monitor, UserPlus, Plus, Upload, History } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { MarkdownViewer } from '../components/ui/MarkdownViewer';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';

const IssueDetail = ({ username, repoName, issues, user, repo }: any) => {
  const location = useLocation();
  const { getToken } = useAuth();
  const issueId = location.pathname.split('/').pop()!;
  const issue = issues.find((i: any) => i.id === issueId);
  const [comments, setComments] = useState<any[]>([]);
  
  useEffect(() => {
    if (!issueId) return;
    fetch(`/api/repos/${username}/${repoName}/issues/${issueId}/comments`)
      .then(res => res.json())
      .then(setComments);
  }, [username, repoName, issueId]);

  if (!issue) return <div>Issue not found</div>;
  
  return (
    <div>
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-semibold text-gray-900">{issue.title} <span className="text-gray-400 font-light">#{issue.id.substring(0, 4)}</span></h2>
          {user && user.id === repo.ownerId && (
            <button 
              onClick={async () => {
                const newStatus = issue.status === 'open' ? 'closed' : 'open';
                const token = await getToken();
                await fetch(`/api/repos/${username}/${repoName}/issues/${issueId}`, {
                  method: 'PATCH',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ status: newStatus })
                });
                window.location.reload();
              }}
              className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm"
            >
              {issue.status === 'open' ? 'Close issue' : 'Reopen issue'}
            </button>
          )}
        </div>
        <div className="flex items-center text-sm text-gray-500 space-x-2">
          <span className={`px-2 py-1 rounded-full text-white font-semibold flex items-center ${issue.status === 'open' ? 'bg-green-600' : 'bg-purple-600'}`}>
            <CircleDot className="w-4 h-4 mr-1" /> {issue.status === 'open' ? 'Open' : 'Closed'}
          </span>
          <span>
            <span className="font-semibold text-gray-700">{issue.creatorUsername}</span> opened this issue on {format(new Date(issue.createdAt), 'MMM d, yyyy')}
          </span>
        </div>
      </div>
      
      <div className="flex gap-6">
        <div className="w-3/4">
          <div className="border border-gray-300 rounded-md mb-6">
            <div className="bg-gray-50 border-b border-gray-300 px-4 py-2 text-sm text-gray-700">
              <span className="font-semibold">{issue.creatorUsername}</span> commented
            </div>
            <div className="p-4 prose max-w-none">
              <MarkdownViewer content={issue.description || '*No description provided.*'} />
            </div>
          </div>

          {comments.map(comment => (
            <div key={comment.id} className="border border-gray-300 rounded-md mb-6 ml-8 relative">
              <div className="absolute -left-8 top-4 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                {comment.authorUsername[0].toUpperCase()}
              </div>
              <div className="bg-gray-50 border-b border-gray-300 px-4 py-2 text-sm text-gray-700">
                <span className="font-semibold">{comment.authorUsername}</span> commented on {format(new Date(comment.createdAt), 'MMM d, yyyy')}
              </div>
              <div className="p-4 prose max-w-none">
                <MarkdownViewer content={comment.content} />
              </div>
            </div>
          ))}

          {user && (
            <div className="border border-gray-300 rounded-md mb-6 ml-8 relative">
              <div className="absolute -left-8 top-4 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                {(user.username || user.firstName || 'U')[0].toUpperCase()}
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value;
                
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
                  window.location.reload();
                }
              }}>
                <div className="bg-gray-50 border-b border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                  Add a comment
                </div>
                <div className="p-2">
                  <textarea 
                    name="content"
                    placeholder="Leave a comment" 
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  ></textarea>
                </div>
                <div className="bg-gray-50 p-2 flex justify-end">
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-4 rounded-md text-sm">
                    Comment
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
        <div className="w-1/4">
          <div className="text-sm text-gray-500">
            <div className="border-b border-gray-200 pb-2 mb-2 font-semibold text-gray-700">Assignees</div>
            No one assigned
          </div>
        </div>
      </div>
    </div>
  );
};

import { languageColors } from '../utils/languageColors';
import { LoadingScreen } from '../components/ui/loading-states';

const CommitDetailView = ({ username, repoName, commits }: { username: string, repoName: string, commits: any[] }) => {
  const { commitId } = useParams();
  const [changedFiles, setChangedFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const commit = commits.find(c => c.id === commitId);

  useEffect(() => {
    if (!commitId) return;
    fetch(`/api/repos/${username}/${repoName}/commits/${commitId}/files`)
      .then(res => res.json())
      .then(data => {
        setChangedFiles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setChangedFiles([]);
        setLoading(false);
      });
  }, [commitId]);

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

export const Repository = () => {
  const { username, repoName } = useParams<{ username: string, repoName: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  
  const [repo, setRepo] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fileOffset, setFileOffset] = useState(0);
  const [hasMoreFiles, setHasMoreFiles] = useState(true);
  const [currentPath, setCurrentPath] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAddFileOpen, setIsAddFileOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [uploadFiles, setUploadFiles] = useState<{ file: File, path: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [commitSummary, setCommitSummary] = useState('Add files via upload');
  const [commitDescription, setCommitDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const addFileRef = React.useRef<HTMLDivElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(f => {
        // Use webkitRelativePath if available (from folder selection)
        // Otherwise fallback to name
        const path = (f as any).webkitRelativePath || f.name;
        return { file: f, path };
      });
      setUploadFiles(prev => [...prev, ...newFiles].slice(0, 100));
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
      if (entry.isFile) {
        try {
          const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
          filesWithPaths.push({ file, path: path + file.name });
          setAnalyzedCount(prev => prev + 1);
        } catch (e) {
          console.error("File read error:", e);
        }
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readEntries = () => new Promise<any[]>((resolve, reject) => reader.readEntries(resolve, reject));
        
        let hasChildren = false;
        try {
          let entries = await readEntries();
          while (entries.length > 0) {
            hasChildren = true;
            // Process entries in parallel for massive speed boost
            await Promise.all(entries.map(child => traverseEntry(child, path + entry.name + "/")));
            entries = await readEntries();
          }
          if (!hasChildren) {
            const gitkeep = new File([""], ".gitkeep", { type: "text/plain" });
            filesWithPaths.push({ file: gitkeep, path: path + entry.name + "/.gitkeep" });
            setAnalyzedCount(prev => prev + 1);
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
          const item = items[i];
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            rootPromises.push(traverseEntry(entry));
          } else {
            const file = item.getAsFile();
            if (file) {
              filesWithPaths.push({ file, path: file.name });
              setAnalyzedCount(prev => prev + 1);
            }
          }
        }
        await Promise.all(rootPromises);
      }

      // If no files found through items, fallback to standard files
      if (filesWithPaths.length === 0) {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
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
          return unique.slice(0, 1000);
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
              message: commitSummary 
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
  
  const FILE_LIMIT = 100;

  const currentTab = location.pathname.split('/')[3] || '';

  const loadMoreFiles = async () => {
    if (loadingMore || !hasMoreFiles) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/repos/${username}/${repoName}/files?limit=${FILE_LIMIT}&offset=${fileOffset}`);
      if (res.ok) {
        const nextFiles = await res.json();
        setFiles(prev => [...prev, ...nextFiles]);
        setHasMoreFiles(nextFiles.length === FILE_LIMIT);
        setFileOffset(prev => prev + FILE_LIMIT);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const fetchRepoData = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const repoRes = await fetch(`/api/repos/${username}/${repoName}`, { headers });
        if (repoRes.ok) {
          setRepo(await repoRes.json());
          
          const [filesRes, issuesRes, commitsRes] = await Promise.all([
            fetch(`/api/repos/${username}/${repoName}/files?limit=${FILE_LIMIT}&offset=0`),
            fetch(`/api/repos/${username}/${repoName}/issues`),
            fetch(`/api/repos/${username}/${repoName}/commits`)
          ]);
          
          if (filesRes.ok) {
            const initialFiles = await filesRes.json();
            setFiles(initialFiles);
            setHasMoreFiles(initialFiles.length === FILE_LIMIT);
            setFileOffset(FILE_LIMIT);
          }
          if (issuesRes.ok) setIssues(await issuesRes.json());
          if (commitsRes.ok) setCommits(await commitsRes.json());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchRepoData();
  }, [username, repoName]);

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

  const readmeFile = files.find(f => f.path.toLowerCase() === 'readme.md');

  return (
    <div className="bg-[#080808] min-h-screen text-white flex-1">
      {/* Repo Header */}
      <div className="bg-[#0d0d0d] border-b border-zinc-900 pt-6">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center flex-wrap gap-3 text-2xl">
              <Book className="w-6 h-6 text-red-600" />
              <Link to={`/${username}`} className="text-zinc-400 hover:text-white transition-colors font-medium">{username}</Link>
              <span className="text-zinc-700 font-light">/</span>
              <Link to={`/${username}/${repoName}`} className="font-bold text-white hover:text-red-500 transition-colors">{repoName}</Link>
              <span className="text-[11px] font-bold border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-400 ml-2 uppercase tracking-tight">
                {repo.isPrivate ? 'Private' : 'Public'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group overflow-hidden">
                <button 
                  onClick={handleStar}
                  className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-black transition-all ${
                    repo.isStarred 
                      ? 'bg-red-600 text-white' 
                      : 'bg-[#121212] text-zinc-400 hover:text-white'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${repo.isStarred ? 'fill-current' : 'text-red-600'}`} />
                  <span>{repo.isStarred ? 'Unstar' : 'Star'}</span>
                </button>
                <div className="bg-black px-3 py-1.5 text-[10px] font-bold text-white border-l-2 border-black">
                  {repo.starCount || 0}
                </div>
              </div>
              <button className="neo-brutal-button !py-1.5 !px-4 !text-[10px]">
                Fork
              </button>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-2 overflow-x-auto pb-4">
            {[
              { id: '', label: 'Code', icon: <Code className="w-4 h-4" /> },
              { id: 'issues', label: 'Issues', icon: <CircleDot className="w-4 h-4" />, count: issues.length },
              { id: 'commits', label: 'Commits', icon: <History className="w-4 h-4" />, count: commits.length },
              { id: 'pulls', label: 'Pull requests', icon: <GitPullRequest className="w-4 h-4" /> },
              { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, condition: user?.id === repo.ownerId }
            ].map(tab => (
              (tab.condition === undefined || tab.condition) && (
                <Link 
                  key={tab.label}
                  to={`/${username}/${repoName}${tab.id ? '/' + tab.id : ''}`}
                  className={`px-6 py-3.5 text-[11px] font-bold flex items-center gap-3 border-[3px] transition-all relative group font-outfit ${
                    currentTab === tab.id 
                      ? 'border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]' 
                      : 'border-transparent text-zinc-500 hover:text-white hover:border-zinc-800'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`px-2 py-0.5 text-[9px] font-bold ${currentTab === tab.id ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}>
                      {tab.count}
                    </span>
                  )}
                </Link>
              )
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        <Routes>
          <Route path="/" element={
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-6">
                {/* Action Bar */}
                 <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 bg-[#121212] border border-zinc-800 px-4 py-2 text-xs font-bold text-white hover:border-zinc-600 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group">
                      <GitBranch className="w-3.5 h-3.5 text-red-600" />
                      <span className="group-hover:text-red-500 transition-colors">main</span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
                    </button>
                    <div className="hidden md:flex items-center gap-5 text-xs font-bold text-zinc-500">
                      <span className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors">
                        <GitBranch className="w-3.5 h-3.5" /> <strong>1</strong> Branch
                      </span>
                      <span className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors">
                        <Tag className="w-3.5 h-3.5" /> <strong>0</strong> Tags
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 relative">
                    {user && user.id === repo.ownerId && (
                      <div className="relative" ref={addFileRef}>
                        <button 
                          onClick={() => setIsAddFileOpen(!isAddFileOpen)}
                          className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-700 transition-all active:scale-95"
                        >
                          Add file <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAddFileOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isAddFileOpen && (
                          <div className="absolute right-0 mt-3 w-56 bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="bg-red-600 px-4 py-2 border-b-[3px] border-black flex items-center justify-between">
                              <span className="text-[10px] font-black text-white">file operations</span>
                              <div className="flex gap-1">
                                <div className="w-1 h-1 bg-white"></div>
                                <div className="w-1 h-1 bg-white/40"></div>
                              </div>
                            </div>
                            <div className="p-1">
                              <Link 
                                to={`/${username}/${repoName}/new/main`}
                                className="flex items-center gap-3 w-full p-3 text-[11px] font-black text-black hover:bg-red-50 transition-colors group"
                                onClick={() => setIsAddFileOpen(false)}
                              >
                                <div className="w-6 h-6 bg-black text-white flex items-center justify-center group-hover:bg-red-600 transition-colors">
                                  <Plus className="w-3.5 h-3.5" />
                                </div>
                                Create new file
                              </Link>
                              <button 
                                className="flex items-center gap-3 w-full p-3 text-[11px] font-black text-black hover:bg-red-50 transition-colors group border-t border-zinc-100"
                                onClick={() => {
                                  setIsAddFileOpen(false);
                                  navigate(`/${username}/${repoName}/upload/main`);
                                }}
                              >
                                <div className="w-6 h-6 bg-black text-white flex items-center justify-center group-hover:bg-red-600 transition-colors">
                                  <Upload className="w-3.5 h-3.5" />
                                </div>
                                Upload files
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <button className="neo-brutal-button flex items-center gap-2 !py-2 !px-5 !text-xs">
                      <Code className="w-4 h-4" /> Code
                    </button>
                  </div>
                </div>

                {/* File Browser */}
                <div className="border-[3px] border-black bg-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                  <div className="bg-white border-b-[3px] border-black px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {repo.owner?.avatarUrl ? (
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
                      <div className="font-outfit">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-black">{username}</span>
                          <span className="text-[10px] font-semibold text-zinc-400">authorized operator</span>
                        </div>
                        <div className="text-[10px] font-semibold text-zinc-500 flex items-center gap-2">
                          <Activity className="w-3 h-3 text-red-600" /> Latest commit: <span>initial sync protocol</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                      <div className="bg-black text-white px-3 py-1.5 text-[10px] font-bold border-2 border-black font-outfit">
                        {repo.commits?.length || 1} commits
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
                        
                        {/* Latest Commit Bar */}
                        {commits.length > 0 && (
                          <div className="bg-[#121212] border-x-[3px] border-t-[3px] border-black p-6 flex items-center justify-between group hover:bg-[#161616] transition-all">
                            <div className="flex items-center gap-5">
                              <div className="w-8 h-8 bg-black border-2 border-zinc-800 flex items-center justify-center overflow-hidden shadow-[3px_3px_0px_0px_rgba(220,38,38,0.5)] group-hover:border-red-600 transition-colors">
                                <img src={commits[0].authorAvatarUrl} className="w-full h-full object-cover opacity-80" />
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-[11px] font-black text-white uppercase italic tracking-widest">{commits[0].authorUsername}</span>
                                <span className="text-[11px] font-medium text-zinc-400 truncate max-w-[300px] md:max-w-md">{commits[0].message}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 text-[10px] font-black text-zinc-600 uppercase tracking-tighter">
                              <Link to={`/${username}/${repoName}/commits`} className="hover:text-red-500 transition-colors flex items-center gap-2">
                                <span className="bg-zinc-900 px-2 py-0.5 font-mono text-[9px] border border-zinc-800">{commits[0].id.substring(0, 7)}</span>
                                <span>{formatDistanceToNow(new Date(commits[0].timestamp), { addSuffix: true })}</span>
                              </Link>
                              <Link to={`/${username}/${repoName}/commits`} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
                                <History className="w-3.5 h-3.5" />
                                <span>{commits.length} commits</span>
                              </Link>
                            </div>
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
                                      to={`/${username}/${repoName}/blob/main/${file.path}`} 
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
                          to={`/${username}/${repoName}/edit/main/${readmeFile.path}`} 
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
                  <h3 className="text-sm font-bold text-zinc-400 mb-4">About</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-8">{repo.description || 'No description provided.'}</p>
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
                
                <div className="pt-2">
                  <h3 className="text-sm font-bold text-zinc-400 mb-4">Languages</h3>
                  <div className="w-full bg-zinc-900 h-2 mb-4 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div 
                      className="h-full shadow-[0_0_10px_rgba(0,0,0,0.3)]" 
                      style={{ 
                        width: '100%', 
                        backgroundColor: repo.language ? (languageColors[repo.language] || '#dc2626') : '#dc2626',
                        boxShadow: `0 0 10px ${repo.language ? (languageColors[repo.language] || '#dc2626') : '#dc2626'}44`
                      }} 
                    ></div>
                  </div>
                  <div className="space-y-4">
                  {repo.language ? (
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span className="flex items-center gap-2.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: languageColors[repo.language] || '#dc2626' }}
                        /> {repo.language}
                      </span>
                      <span className="text-zinc-500 font-medium">100.0%</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest italic">
                      No language detected
                    </div>
                  )}
                </div>
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
                          <span className="block text-sm font-black text-black uppercase italic -skew-x-6">Ingestion Analysis Active</span>
                          <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{uploadFiles.length} items detected in local_tree</span>
                        </div>
                      </div>

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
                  body: JSON.stringify({ path, content, message })
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
                const filePath = location.pathname.split('/edit/main/')[1] || location.pathname.split('/edit/')[2];
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
                      body: JSON.stringify({ path: file.path, content, message })
                    });
                    
                    if (res.ok) {
                      window.location.href = `/${username}/${repoName}/blob/main/${file.path}`;
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
                    Vault_Archive: <span className="text-red-500">{location.pathname.split('/blob/main/')[1]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {user && user.id === repo.ownerId && (
                    <div className="flex items-center bg-black border-2 border-zinc-800 px-4 py-2 gap-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <Link 
                        to={`/${username}/${repoName}/edit/main/${location.pathname.split('/blob/main/')[1]}`} 
                        className="flex items-center gap-2.5 text-[10px] font-black text-zinc-400 hover:text-white transition-colors uppercase tracking-widest group"
                      >
                        <Pencil className="w-3.5 h-3.5 text-red-600 group-hover:scale-110 transition-transform" />
                        Edit_File
                      </Link>
                      <div className="w-px h-4 bg-zinc-800"></div>
                      <button 
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this file?')) {
                            const filePath = location.pathname.split('/blob/main/')[1];
                            const token = await getToken();
                            const res = await fetch(`/api/repos/${username}/${repoName}/files/${encodeURIComponent(filePath)}`, { 
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (res.ok) {
                              window.location.href = `/${username}/${repoName}`;
                            }
                          }
                        }}
                        className="flex items-center gap-2.5 text-[10px] font-black text-zinc-400 hover:text-red-600 transition-colors uppercase tracking-widest group"
                      >
                        <Trash className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-0 overflow-auto bg-[#050505] min-h-[600px]">
                {(() => {
                  const filePath = location.pathname.split('/blob/main/')[1];
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
                        <pre className={`language-${lang} m-0 !bg-transparent !border-0 !p-12 !pt-12 selection:bg-red-600/30`}>
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

          {/* ... Rest of the sub-pages like settings follow the same theme ... */}
           <Route path="/settings" element={
            <div className="space-y-8">
              <h2 className="text-3xl font-bold tracking-tight mb-8">Settings</h2>
              
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
            <CommitDetailView username={username!} repoName={repoName!} commits={commits} />
          } />
        </Routes>
      </div>
    </div>
  );
};
