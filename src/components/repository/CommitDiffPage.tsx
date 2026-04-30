import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Activity, Code, File as FileIcon } from 'lucide-react';
import { DiffViewer } from './DiffViewer';

export const CommitDiffPage = ({ username, repoName, commits }: { username: string; repoName: string; commits: any[] }) => {
  const { commitId } = useParams();
  const [changedFiles, setChangedFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const commit = commits.find(commit => commit.id === commitId);

  useEffect(() => {
    if (!commitId) return;
    setLoading(true);
    fetch(`/api/repos/${username}/${repoName}/commits/${commitId}/files`)
      .then(res => res.json())
      .then(data => setChangedFiles(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username, repoName, commitId]);

  if (loading) return <div className="p-32 text-center text-zinc-500 font-black uppercase tracking-widest">Loading diff...</div>;
  if (!commit) return <div className="p-32 text-center text-red-500 font-black uppercase tracking-widest">Commit not found</div>;

  return (
    <div className="space-y-8">
      <div className="border-[3px] border-black bg-red-600 text-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="min-w-0">
            <h2 className="text-2xl font-black italic break-words">{commit.message}</h2>
            <p className="mt-3 text-xs font-bold text-red-100">
              {commit.authorUsername} committed {format(new Date(commit.timestamp), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
          <div className="bg-black border-[3px] border-black px-4 py-3 text-xs font-mono break-all">
            {commit.id}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
        <Activity className="size-4 text-red-600" />
        {changedFiles.length} changed files
      </div>

      <div className="space-y-6">
        {changedFiles.map((file) => (
          <div key={file.id || file.path} className="border-[3px] border-black bg-black shadow-[10px_10px_0px_0px_rgba(220,38,38,1)] overflow-hidden">
            <div className="bg-white text-black border-b-[3px] border-black px-5 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon className="size-4 text-red-600 shrink-0" />
                <span className="text-sm font-black truncate">{file.path}</span>
              </div>
              <Link to={`/${username}/${repoName}/blob/main/${file.path}`} className="inline-flex items-center gap-2 text-[10px] font-black text-red-600 hover:text-black">
                <Code className="size-3.5" />
                View file
              </Link>
            </div>
            <DiffViewer before={file.previousContent || ''} after={file.content || ''} />
          </div>
        ))}

        {changedFiles.length === 0 && (
          <div className="border-[3px] border-black bg-white text-black p-12 text-center shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
            <p className="text-sm font-black">No file snapshots were recorded for this commit.</p>
          </div>
        )}
      </div>
    </div>
  );
};
