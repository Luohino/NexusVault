import { useCallback, useEffect, useState } from 'react';

const FILE_LIMIT = 100;

export const useRepositoryData = ({
  username,
  repoName,
  currentBranchName,
  getToken,
}: {
  username?: string;
  repoName?: string;
  currentBranchName: string;
  getToken: () => Promise<string | null>;
}) => {
  const [repo, setRepo] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [wikiPages, setWikiPages] = useState<any[]>([]);
  const [repoSettings, setRepoSettings] = useState<any>(null);
  const [contributors, setContributors] = useState<any[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fileOffset, setFileOffset] = useState(0);
  const [hasMoreFiles, setHasMoreFiles] = useState(true);

  const authedFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const token = await getToken();
    const headers = {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(url, { ...init, headers });
  }, [getToken]);

  const resetRepositoryData = useCallback(() => {
    setRepo(null);
    setFiles([]);
    setIssues([]);
    setCommits([]);
    setTags([]);
    setReleases([]);
    setBranches([]);
    setPullRequests([]);
    setTopics([]);
    setWikiPages([]);
    setRepoSettings(null);
    setContributors([]);
    setFileOffset(0);
    setHasMoreFiles(true);
  }, []);

  const fetchRepoData = useCallback(async () => {
    if (!username || !repoName) return;
    if (!repo) setLoading(true);
    setAccessDenied(false);
    try {
      const repoRes = await authedFetch(`/api/repos/${username}/${repoName}`);
      if (repoRes.status === 403) {
        setAccessDenied(true);
        resetRepositoryData();
        return;
      }
      if (!repoRes.ok) {
        setRepo(null);
        return;
      }

      const nextRepo = await repoRes.json();
      setRepo(nextRepo);

      const [filesRes, issuesRes, commitsRes, tagsRes, releasesRes, branchesRes, pullsRes, topicsRes, wikiRes, settingsRes, contributorsRes] = await Promise.all([
        authedFetch(`/api/repos/${username}/${repoName}/files?branch=${encodeURIComponent(currentBranchName)}&limit=${FILE_LIMIT}&offset=0`),
        authedFetch(`/api/repos/${username}/${repoName}/issues`),
        authedFetch(`/api/repos/${username}/${repoName}/commits`),
        authedFetch(`/api/repos/${username}/${repoName}/tags`),
        authedFetch(`/api/repos/${username}/${repoName}/releases`),
        authedFetch(`/api/repos/${username}/${repoName}/branches`),
        authedFetch(`/api/repos/${username}/${repoName}/pulls`),
        authedFetch(`/api/repos/${username}/${repoName}/topics`),
        authedFetch(`/api/repos/${username}/${repoName}/wiki`),
        authedFetch(`/api/repos/${username}/${repoName}/settings`),
        authedFetch(`/api/repos/${username}/${repoName}/contributors`),
      ]);

      if (filesRes.ok) {
        const initialFiles = await filesRes.json();
        setFiles(initialFiles);
        setHasMoreFiles(initialFiles.length === FILE_LIMIT);
        setFileOffset(FILE_LIMIT);
      }
      if (issuesRes.ok) setIssues(await issuesRes.json());
      if (commitsRes.ok) setCommits(await commitsRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
      if (releasesRes.ok) setReleases(await releasesRes.json());
      if (branchesRes.ok) setBranches(await branchesRes.json());
      if (pullsRes.ok) setPullRequests(await pullsRes.json());
      if (topicsRes.ok) setTopics(await topicsRes.json());
      if (wikiRes.ok) setWikiPages(await wikiRes.json());
      if (settingsRes.ok) setRepoSettings(await settingsRes.json());
      if (contributorsRes.ok) setContributors(await contributorsRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [authedFetch, currentBranchName, repoName, resetRepositoryData, username]);

  const loadMoreFiles = useCallback(async () => {
    if (!username || !repoName || loadingMore || !hasMoreFiles) return;
    setLoadingMore(true);
    try {
      const res = await authedFetch(`/api/repos/${username}/${repoName}/files?branch=${encodeURIComponent(currentBranchName)}&limit=${FILE_LIMIT}&offset=${fileOffset}`);
      if (res.ok) {
        const nextFiles = await res.json();
        setFiles(prev => [...prev, ...nextFiles]);
        setHasMoreFiles(nextFiles.length === FILE_LIMIT);
        setFileOffset(prev => prev + FILE_LIMIT);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  }, [authedFetch, currentBranchName, fileOffset, hasMoreFiles, loadingMore, repoName, username]);

  useEffect(() => {
    fetchRepoData();
  }, [fetchRepoData]);

  return {
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
  };
};
