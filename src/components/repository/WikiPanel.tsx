import { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Trash } from 'lucide-react';
import { MarkdownViewer } from '../ui/MarkdownViewer';
import { INPUT_LIMITS } from '../../utils/inputLimits';

const WikiPageDetail = ({ username, repoName, user, repo, getToken, onChanged }: any) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch(`/api/repos/${username}/${repoName}/wiki/${slug}`)
      .then(res => res.json())
      .then(data => {
        setPage(data);
        setTitle(data.title || '');
        setContent(data.content || '');
      });
  }, [username, repoName, slug]);

  const save = async () => {
    const token = await getToken();
    const res = await fetch(`/api/repos/${username}/${repoName}/wiki/${slug}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    if (res.ok) {
      const next = await res.json();
      setPage(next);
      setEditing(false);
      onChanged?.();
      if (next.slug !== slug) navigate(`../${next.slug}`, { replace: true });
    }
  };

  const remove = async () => {
    if (!confirm('Delete this wiki page?')) return;
    const token = await getToken();
    const res = await fetch(`/api/repos/${username}/${repoName}/wiki/${slug}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onChanged?.();
      navigate(`/${username}/${repoName}/wiki`);
    }
  };

  if (!page) return <div className="p-16 text-zinc-500">Loading wiki page...</div>;

  return (
    <div className="border-[3px] border-black bg-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] overflow-hidden">
      <div className="bg-red-600 text-white border-b-[3px] border-black px-4 sm:px-6 md:px-8 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-5">
        <div>
          <h2 className="text-2xl font-black italic">{page.title}</h2>
          <p className="text-xs font-bold text-red-100 mt-2">Updated {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}</p>
        </div>
        {user?.id === repo.ownerId && (
          <div className="flex gap-2 self-start">
            <button onClick={() => setEditing(!editing)} className="bg-white text-black border-2 border-black p-2"><Pencil className="w-4 h-4" /></button>
            <button onClick={remove} className="bg-black text-white border-2 border-black p-2"><Trash className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      <div className="bg-[#050505] p-4 sm:p-6 md:p-8">
        {editing ? (
          <div className="space-y-4 bg-white text-black border-[3px] border-black p-4 sm:p-6">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={INPUT_LIMITS.wikiTitle} className="w-full border-[3px] border-black px-4 py-3 font-black" />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={14} maxLength={INPUT_LIMITS.wikiContent} className="w-full border-[3px] border-black px-4 py-3 font-mono text-sm" />
            <button onClick={save} className="bg-red-600 text-white border-[3px] border-black px-6 py-3 text-sm font-black">Save page</button>
          </div>
        ) : (
          <div className="bg-[#080808] text-white border-[3px] border-black p-4 sm:p-6">
            <MarkdownViewer 
              content={page.content} 
              baseUrl={`/${username}/${repoName}/blob/main`}
              imageBaseUrl={`/api/repos/${username}/${repoName}/raw/main`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const WikiPanel = ({ username, repoName, wikiPages, user, repo, getToken, onCreate, onChanged }: any) => (
  <Routes>
    <Route path="/" element={
      <div className="border-[3px] border-black bg-black shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] overflow-hidden">
        <div className="bg-red-600 border-b-[3px] border-black px-4 sm:px-6 md:px-8 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Wiki</h2>
            <p className="text-sm text-red-100 mt-2 font-semibold">Project documentation beyond the README</p>
          </div>
          {user?.id === repo.ownerId && (
            <button onClick={onCreate} className="bg-white text-black px-6 py-3 text-[11px] font-black border-[3px] border-black">New page</button>
          )}
        </div>
        <div className="p-4 sm:p-6 md:p-8 bg-[#050505] space-y-4">
          {wikiPages.map((page: any) => (
            <Link key={page.id} to={page.slug} className="block bg-white text-black border-[3px] border-black p-4 sm:p-6 shadow-[7px_7px_0px_0px_rgba(220,38,38,1)]">
              <h3 className="text-lg sm:text-xl font-black mb-2 break-words">{page.title}</h3>
              <p className="text-xs font-bold text-zinc-500">Updated {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}</p>
            </Link>
          ))}
          {wikiPages.length === 0 && <div className="p-16 text-center text-zinc-500">No wiki pages yet</div>}
        </div>
      </div>
    } />
    <Route path=":slug" element={<WikiPageDetail username={username} repoName={repoName} user={user} repo={repo} getToken={getToken} onChanged={onChanged} />} />
  </Routes>
);
