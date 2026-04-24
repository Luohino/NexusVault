import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { GitPullRequest, ShieldCheck } from 'lucide-react';
import { DiffViewer } from './DiffViewer';

export const PullRequestsPanel = ({ username, repoName, repo, user, getToken, pullRequests, currentBranchName, defaultBranch = 'main', onCreate, onMerge }: any) => {
  const [openPullId, setOpenPullId] = useState<string | null>(pullRequests[0]?.id || null);
  const [compare, setCompare] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);

  const selectedPull = pullRequests.find((pull: any) => pull.id === openPullId);

  const loadDetails = async (pullId: string) => {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const [compareRes, reviewRes] = await Promise.all([
      fetch(`/api/repos/${username}/${repoName}/pulls/${pullId}/compare`, { headers }),
      fetch(`/api/repos/${username}/${repoName}/pulls/${pullId}/reviews`, { headers }),
    ]);
    if (compareRes.ok) setCompare(await compareRes.json());
    if (reviewRes.ok) setReviews(await reviewRes.json());
  };

  useEffect(() => {
    if (openPullId) loadDetails(openPullId);
  }, [openPullId, getToken, username, repoName]);

  const submitReview = async (status: 'approved' | 'changes_requested' | 'commented') => {
    if (!selectedPull) return;
    const token = await getToken();
    const res = await fetch(`/api/repos/${username}/${repoName}/pulls/${selectedPull.id}/reviews`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, comment: status === 'approved' ? 'Approved' : status === 'changes_requested' ? 'Changes requested' : 'Left a review comment' }),
    });
    if (res.ok) loadDetails(selectedPull.id);
  };

  const reviewTone = (status: string) => {
    if (status === 'approved') return 'bg-green-600 text-white';
    if (status === 'changes_requested') return 'bg-red-600 text-white';
    return 'bg-zinc-700 text-white';
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="border-[3px] border-black bg-black shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] overflow-hidden">
        <div className="bg-red-600 border-b-[3px] border-black px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-white">Pull requests</h2>
            <p className="text-xs font-bold text-red-100 mt-1">Review, approve, merge</p>
          </div>
          {user?.id === repo.ownerId && currentBranchName !== defaultBranch && (
            <button onClick={onCreate} className="bg-white text-black border-2 border-black px-3 py-2 text-[10px] font-black">New</button>
          )}
        </div>
        <div className="divide-y-[3px] divide-black">
          {pullRequests.map((pull: any) => (
            <button
              key={pull.id}
              onClick={() => setOpenPullId(pull.id)}
              className={`w-full text-left p-5 ${openPullId === pull.id ? 'bg-white text-black' : 'bg-[#050505] text-white hover:bg-zinc-900'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <GitPullRequest className="w-4 h-4 text-red-600" />
                <span className="text-sm font-black">{pull.title}</span>
              </div>
              <p className="text-xs font-bold text-zinc-500">{pull.sourceBranch} into {pull.targetBranch}</p>
            </button>
          ))}
          {pullRequests.length === 0 && <div className="p-12 text-center text-zinc-500 text-sm">No pull requests yet</div>}
        </div>
      </div>

      {selectedPull ? (
        <div className="space-y-6">
          <div className="border-[3px] border-black bg-white text-black p-6 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black">{selectedPull.title}</h3>
                <p className="text-xs font-bold text-zinc-500 mt-2">
                  {selectedPull.sourceBranch} into {selectedPull.targetBranch}
                  {selectedPull.createdAt && ` / ${formatDistanceToNow(new Date(selectedPull.createdAt), { addSuffix: true })}`}
                </p>
              </div>
              {user && selectedPull.status === 'open' && (
                <div className="flex gap-2">
                  <button onClick={() => submitReview('approved')} className="bg-white text-black border-[3px] border-black px-4 py-2 text-xs font-black flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-red-600" />
                    Approve
                  </button>
                  <button onClick={() => submitReview('changes_requested')} className="bg-black text-white border-[3px] border-black px-4 py-2 text-xs font-black">
                    Request changes
                  </button>
                  <button onClick={() => submitReview('commented')} className="bg-zinc-200 text-black border-[3px] border-black px-4 py-2 text-xs font-black">
                    Comment
                  </button>
                  <button onClick={() => onMerge(selectedPull.id)} className="bg-red-600 text-white border-[3px] border-black px-4 py-2 text-xs font-black">Merge</button>
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {reviews.map((review: any) => (
                <span key={review.id} className={`px-3 py-1 text-[10px] font-black border-2 border-black ${reviewTone(review.status)}`}>
                  {(review.status || 'commented').replace('_', ' ')} by {review.reviewerUsername || 'operator'}
                </span>
              ))}
              {compare?.conflicts?.length > 0 && <span className="bg-red-600 text-white px-3 py-1 text-[10px] font-black border-2 border-black">Conflicts detected</span>}
            </div>
          </div>

          {compare?.changedFiles?.map((file: any) => (
            <div key={file.path} className="border-[3px] border-black bg-black shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] overflow-hidden">
              <div className="bg-white text-black border-b-[3px] border-black px-5 py-3 flex justify-between">
                <span className="text-sm font-black">{file.path}</span>
                <span className="text-[10px] font-black text-red-600">{file.status}</span>
              </div>
              <DiffViewer before={file.targetContent} after={file.sourceContent} />
            </div>
          ))}
        </div>
      ) : (
        <div className="border-[3px] border-black bg-white text-black p-16 text-center shadow-[8px_8px_0px_0px_rgba(220,38,38,1)]">
          <p className="font-black">Select a pull request.</p>
        </div>
      )}
    </div>
  );
};
