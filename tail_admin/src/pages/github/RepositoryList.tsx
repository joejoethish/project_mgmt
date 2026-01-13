import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AdvancedTable, AdvancedTableColumn } from '../../components/tables/AdvancedTable';
import { toast, Toaster } from 'react-hot-toast';

const API_BASE = 'http://192.168.1.26:8000/api/github';

interface Repository {
  repo_id: string;
  organization_name: string;
  github_id: number;
  name: string;
  project: string | null;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  is_private: boolean;
  is_tracked: boolean;
  last_sync: string | null;
  commits_count: number;
  prs_count: number;
  [key: string]: unknown; // Index signature for AdvancedTable
}

interface Project {
  project_id: string;
  name: string;
}

const RepositoryList = () => {
  const queryClient = useQueryClient();
  const [filterMode, setFilterMode] = useState<'all' | 'tracked' | 'untracked'>('all');
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [syncingRepos, setSyncingRepos] = useState<Set<string>>(new Set());

  // Fetch Projects for dropdown
  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects-list'],
    queryFn: async () => (await axios.get('http://192.168.1.26:8000/api/pm/projects/')).data
  });

  const { data: repos, isLoading, error } = useQuery<Repository[]>({
    queryKey: ['github-repos'],
    queryFn: async () => (await axios.get(`${API_BASE}/repos/`)).data
  });

  // Link Project Mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ repoId, projectId }: { repoId: string, projectId: string | null }) => {
      return axios.patch(`${API_BASE}/repos/${repoId}/`, { project: projectId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-repos'] });
      toast.success('Project linked successfully');
    },
    onError: () => {
      toast.error('Failed to link project');
    }
  });

  // Filter repos based on mode
  const filteredRepos = repos?.filter(repo => {
    if (filterMode === 'tracked') return repo.is_tracked;
    if (filterMode === 'untracked') return !repo.is_tracked;
    return true;
  }) || [];

  const toggleMutation = useMutation({
    mutationFn: async (repoId: string) => {
      return axios.post(`${API_BASE}/repos/${repoId}/toggle_tracking/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-repos'] });
    },
    onError: () => {
      toast.error('Failed to update tracking');
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (repoId: string) => {
      setSyncingRepos(prev => new Set(prev).add(repoId));
      return axios.post(`${API_BASE}/repos/${repoId}/sync/`);
    },
    onSuccess: (_, repoId) => {
      queryClient.invalidateQueries({ queryKey: ['github-repos'] });
      const repo = repos?.find(r => r.repo_id === repoId);
      toast.success(`Synced ${repo?.name || 'repository'}`);
      setSyncingRepos(prev => {
        const next = new Set(prev);
        next.delete(repoId);
        return next;
      });
    },
    onError: (_, repoId) => {
      toast.error('Sync failed');
      setSyncingRepos(prev => {
        const next = new Set(prev);
        next.delete(repoId);
        return next;
      });
    }
  });

  // Bulk toggle tracking
  const handleBulkToggle = async (track: boolean) => {
    const reposToToggle = filteredRepos.filter(r => 
      selectedRepos.has(r.repo_id) && r.is_tracked !== track
    );
    
    if (reposToToggle.length === 0) {
      toast.error(`No repos to ${track ? 'track' : 'untrack'}`);
      return;
    }

    toast.loading(`${track ? 'Tracking' : 'Untracking'} ${reposToToggle.length} repos...`, { id: 'bulk' });
    
    for (const repo of reposToToggle) {
      await toggleMutation.mutateAsync(repo.repo_id);
    }
    
    toast.success(`${track ? 'Tracked' : 'Untracked'} ${reposToToggle.length} repos`, { id: 'bulk' });
    setSelectedRepos(new Set());
  };

  // Bulk sync tracked repos
  const handleBulkSync = async () => {
    const reposToSync = filteredRepos.filter(r => 
      selectedRepos.has(r.repo_id) && r.is_tracked
    );
    
    if (reposToSync.length === 0) {
      toast.error('No tracked repos selected to sync');
      return;
    }

    toast.loading(`Syncing ${reposToSync.length} repos...`, { id: 'bulk-sync' });
    
    for (const repo of reposToSync) {
      setSyncingRepos(prev => new Set(prev).add(repo.repo_id));
      try {
        await axios.post(`${API_BASE}/repos/${repo.repo_id}/sync/`);
      } catch {
        // Continue with others
      }
      setSyncingRepos(prev => {
        const next = new Set(prev);
        next.delete(repo.repo_id);
        return next;
      });
    }
    
    queryClient.invalidateQueries({ queryKey: ['github-repos'] });
    toast.success(`Synced ${reposToSync.length} repos`, { id: 'bulk-sync' });
    setSelectedRepos(new Set());
  };

  // Select all visible
  const handleSelectAll = () => {
    if (selectedRepos.size === filteredRepos.length) {
      setSelectedRepos(new Set());
    } else {
      setSelectedRepos(new Set(filteredRepos.map(r => r.repo_id)));
    }
  };

  const trackedCount = repos?.filter(r => r.is_tracked).length || 0;
  const totalCount = repos?.length || 0;

  const columns: AdvancedTableColumn<Repository>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedRepos.size === filteredRepos.length && filteredRepos.length > 0}
          onChange={handleSelectAll}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      ) as unknown as string,
      render: (_value, row) => (
        <input
          type="checkbox"
          checked={selectedRepos.has(row.repo_id)}
          onChange={(e) => {
            e.stopPropagation();
            const next = new Set(selectedRepos);
            if (next.has(row.repo_id)) {
              next.delete(row.repo_id);
            } else {
              next.add(row.repo_id);
            }
            setSelectedRepos(next);
          }}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      ),
    },
    {
      key: 'is_tracked',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {value ? 'Tracked' : 'Not Tracked'}
        </span>
      ),
    },
    {
      key: 'full_name',
      header: 'Repository',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-xs font-bold">
            {(row.name as string).charAt(0).toUpperCase()}
          </div>
          <div>
            <a 
              href={row.html_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-medium text-gray-800 dark:text-gray-200 hover:text-indigo-600 transition"
              onClick={(e) => e.stopPropagation()}
            >
              {row.name}
            </a>
            {row.is_private && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-yellow-100 text-yellow-700 rounded font-medium">🔒 Private</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'organization_name',
      header: 'Org',
      sortable: true,
    },
    {
      key: 'default_branch',
      header: 'Branch',
      render: (value) => (
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded font-mono text-xs text-gray-600 dark:text-gray-400">
          {value as string}
        </span>
      ),
    },
    {
      key: 'stats',
      header: 'Activity',
      render: (_value, row) => (
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            (row.commits_count as number) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-400'
          }`}>
            {row.commits_count} Commits
          </span>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            (row.prs_count as number) > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-400'
          }`}>
            {row.prs_count} PRs
          </span>
        </div>
      ),
    },
    {
      key: 'project',
      header: 'Linked Project',
      render: (_value, row) => {
        const isLinked = !!row.project;
        return (
          <div className="flex flex-col gap-1">
            <select
              className={`text-sm border-gray-300 rounded-md shadow-sm 
                focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 
                dark:bg-gray-800 dark:border-gray-700 w-40
                ${isLinked ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-700' : ''}
              `}
              value={row.project || ''}
              disabled={isLinked}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const val = e.target.value;
                updateProjectMutation.mutate({ 
                  repoId: row.repo_id, 
                  projectId: val === '' ? null : val 
                });
              }}
            >
              <option value="">Select Project...</option>
              {projects?.map(p => (
                <option key={p.project_id} value={p.project_id}>
                  {p.name}
                </option>
              ))}
            </select>
            {isLinked && (
               <span className="text-[10px] text-gray-500">
                 Manage in Project
               </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'last_sync',
      header: 'Last Sync',
      sortable: true,
      render: (value) => value ? (
        <span className="text-gray-500 text-sm whitespace-nowrap">{new Date(value as string).toLocaleString()}</span>
      ) : (
        <span className="text-gray-400 text-sm italic">Never</span>
      ),
    },
    {
      key: 'repo_id',
      header: 'Actions',
      render: (_value, row) => (
        <div className="flex gap-2">
          {!row.is_tracked ? (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await toggleMutation.mutateAsync(row.repo_id);
                syncMutation.mutate(row.repo_id);
              }}
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Track & Sync
            </button>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  syncMutation.mutate(row.repo_id);
                }}
                disabled={syncingRepos.has(row.repo_id)}
                className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition font-medium disabled:opacity-50"
              >
                {syncingRepos.has(row.repo_id) ? "Syncing..." : "Sync"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMutation.mutate(row.repo_id);
                }}
                className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
              >
                Untrack
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-500">
        Failed to load repositories
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <Toaster position="top-center" />
      
      {/* Stats & Filters Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{totalCount}</span>
            <span className="text-sm text-gray-500 ml-2">Total Repos</span>
          </div>
          <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700">
            <span className="text-2xl font-bold text-green-600">{trackedCount}</span>
            <span className="text-sm text-gray-500 ml-2">Tracked</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl p-1 shadow border border-gray-100 dark:border-gray-700">
          {[
            { value: 'all', label: 'All', count: totalCount },
            { value: 'tracked', label: 'Tracked', count: trackedCount },
            { value: 'untracked', label: 'Untracked', count: totalCount - trackedCount },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilterMode(tab.value as typeof filterMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filterMode === tab.value
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label} <span className="text-xs opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRepos.size > 0 && (
        <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-indigo-700 dark:text-indigo-300">
              {selectedRepos.size} repo{selectedRepos.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedRepos(new Set())}
              className="text-sm text-indigo-600 hover:underline"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkToggle(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center gap-2"
            >
              <span>✓</span> Track Selected
            </button>
            <button
              onClick={() => handleBulkToggle(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium flex items-center gap-2"
            >
              <span>✗</span> Untrack Selected
            </button>
            <button
              onClick={handleBulkSync}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium flex items-center gap-2"
            >
              <span>🔄</span> Sync Selected
            </button>
          </div>
        </div>
      )}

      <AdvancedTable<Repository>
        data={filteredRepos}
        columns={columns}
        title="Repositories"
        description="Toggle tracking and sync commits/PRs for your repositories"
        rowKey="repo_id"
        
        enableSearch={true}
        enablePagination={true}
        enableExport={true}
        enableColumnVisibility={true}
        enableStickyHeader={true}
        
        pageSize={25}
      />
    </div>
  );
};

export default RepositoryList;
