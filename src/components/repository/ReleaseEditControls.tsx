import { useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { FileArchive, Pencil, Trash, Upload, X } from 'lucide-react';

const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const ReleaseEditControls = ({ username, repoName, release, onChanged }: any) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(release.title || '');
  const [body, setBody] = useState(release.body || '');
  const [isDraft, setIsDraft] = useState(Boolean(release.isDraft));
  const [isPrerelease, setIsPrerelease] = useState(Boolean(release.isPrerelease));
  const [assets, setAssets] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const authedFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  };

  const saveRelease = async () => {
    setSaving(true);
    try {
      const releaseRes = await authedFetch(`/api/repos/${username}/${repoName}/releases/${release.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title, body, isDraft, isPrerelease }),
      });
      if (!releaseRes.ok) return alert('Failed to save release');
      if (assets.length > 0) {
        const encodedAssets = await Promise.all(assets.map(async (file) => ({
          name: file.name,
          size: file.size,
          contentType: file.type || 'application/octet-stream',
          dataBase64: await fileToBase64(file),
        })));
        const assetRes = await authedFetch(`/api/repos/${username}/${repoName}/releases/${release.id}/assets`, {
          method: 'POST',
          body: JSON.stringify({ assets: encodedAssets }),
        });
        if (!assetRes.ok) return alert('Release saved, but asset upload failed');
      }
      setEditing(false);
      setAssets([]);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const deleteAsset = async (assetId: string) => {
    if (!confirm('Delete this release asset?')) return;
    const res = await authedFetch(`/api/repos/${username}/${repoName}/releases/assets/${assetId}`, { method: 'DELETE' });
    if (res.ok) onChanged?.();
  };

  return (
    <div className="border-[3px] border-black bg-white text-black shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
      <div className="bg-black text-white border-b-[3px] border-black px-5 py-4 flex items-center justify-between">
        <h3 className="text-sm font-black">Release controls</h3>
        <button onClick={() => setEditing(!editing)} className="bg-white text-black border-2 border-black p-2">
          {editing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        </button>
      </div>
      {editing ? (
        <div className="p-5 space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border-[3px] border-black px-3 py-2 font-black" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="w-full border-[3px] border-black px-3 py-2 font-mono text-sm" />
          <label className="flex items-center gap-2 text-sm font-black">
            <input type="checkbox" checked={isDraft} onChange={(e) => setIsDraft(e.target.checked)} />
            Save as draft
          </label>
          <label className="flex items-center gap-2 text-sm font-black">
            <input type="checkbox" checked={isPrerelease} onChange={(e) => setIsPrerelease(e.target.checked)} />
            Mark as pre-release
          </label>
          <label className="flex items-center gap-3 border-[3px] border-dashed border-black p-4 cursor-pointer">
            <Upload className="w-5 h-5 text-red-600" />
            <span className="text-xs font-black">{assets.length ? `${assets.length} file(s) selected` : 'Add or replace assets'}</span>
            <input type="file" multiple className="hidden" onChange={(e) => setAssets(Array.from(e.target.files || []))} />
          </label>
          <button onClick={saveRelease} disabled={saving} className="bg-red-600 text-white border-[3px] border-black px-6 py-3 text-xs font-black">
            {saving ? 'Saving...' : 'Save release'}
          </button>
        </div>
      ) : (
        <div className="p-5 space-y-3">
          {(release.assets || []).map((asset: any) => (
            <div key={asset.id} className="flex items-center gap-3 border-2 border-black p-3">
              <FileArchive className="w-4 h-4 text-red-600" />
              <span className="min-w-0 flex-1 text-xs font-black truncate">{asset.name}</span>
              <button onClick={() => deleteAsset(asset.id)} className="text-red-600 hover:text-black"><Trash className="w-4 h-4" /></button>
            </div>
          ))}
          {(release.assets || []).length === 0 && <p className="text-xs font-bold text-zinc-500">No editable assets yet.</p>}
        </div>
      )}
    </div>
  );
};
