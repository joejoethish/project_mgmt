import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = 'http://192.168.1.26:8000/api/github';

interface DashboardStats {
  organizations: number;
  repositories: number;
  tracked_repositories: number;
  total_commits: number;
  total_pull_requests: number;
  total_peer_reviews: number;
  commits_last_7_days: number;
  commits_last_30_days: number;
  prs_last_7_days: number;
  prs_last_30_days: number;
  open_prs: number;
  merged_prs: number;
  closed_prs: number;
  last_sync: string | null;
  top_contributors: { author_login: string; commit_count: number; additions: number; deletions: number }[];
  active_repos: { full_name: string; html_url: string; commits_count: number; prs_count: number; open_prs: number }[];
}

const GitHubDashboard = () => {
  const queryClient = useQueryClient();
  
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['github-dashboard'],
    queryFn: async () => (await axios.get(`${API_BASE}/dashboard/`)).data
  });

  // Fetch organizations for sync
  const { data: orgs } = useQuery({
    queryKey: ['github-orgs'],
    queryFn: async () => (await axios.get(`${API_BASE}/organizations/`)).data
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      // Sync all active organizations
      const activeOrgs = orgs?.filter((o: { is_active: boolean }) => o.is_active) || [];
      for (const org of activeOrgs) {
        await axios.post(`${API_BASE}/organizations/${org.org_id}/sync/`);
      }
    },
    onSuccess: () => {
      toast.success('Sync started! This may take a few minutes.');
      queryClient.invalidateQueries({ queryKey: ['github-dashboard'] });
    },
    onError: (err: Error) => {
      toast.error(`Sync failed: ${err.message}`);
    }
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading GitHub stats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="text-xl">⚠️ Failed to load dashboard</p>
          <p className="mt-2 text-sm">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <span className="text-3xl">🐙</span> GitHub Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Track commits, PRs, and code reviews across your repositories</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            <span className="text-gray-400">Last synced:</span>{' '}
            <span className="font-medium">{formatLastSync(stats?.last_sync || null)}</span>
          </div>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !orgs?.length}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition"
          >
            {syncMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Syncing...
              </>
            ) : (
              <>🔄 Sync All</>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard title="Organizations" value={stats?.organizations || 0} icon="🏢" color="blue" />
        <StatCard title="Repositories" value={stats?.repositories || 0} subtitle={`${stats?.tracked_repositories || 0} tracked`} icon="📁" color="purple" />
        <StatCard title="Total Commits" value={stats?.total_commits || 0} subtitle={`+${stats?.commits_last_7_days || 0} this week`} icon="📝" color="green" />
        <StatCard title="Pull Requests" value={stats?.total_pull_requests || 0} subtitle={`${stats?.open_prs || 0} open`} icon="🔀" color="orange" />
        <StatCard title="Merged PRs" value={stats?.merged_prs || 0} icon="✅" color="emerald" />
        <StatCard title="Peer Reviews" value={stats?.total_peer_reviews || 0} icon="👥" color="pink" />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Contributors */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-700">
            <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              🏆 Top Contributors <span className="text-xs text-gray-500 font-normal">(Last 30 days)</span>
            </h2>
          </div>
          <div className="divide-y dark:divide-gray-700">
            {stats?.top_contributors?.length ? (
              stats.top_contributors.map((contributor, idx) => (
                <div key={contributor.author_login} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                      {idx + 1}
                    </span>
                    <a 
                      href={`https://github.com/${contributor.author_login}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-800 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                    >
                      {contributor.author_login || 'Unknown'}
                    </a>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">{contributor.commit_count} commits</span>
                    <span className="text-green-600">+{contributor.additions || 0}</span>
                    <span className="text-red-500">-{contributor.deletions || 0}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-400">
                No data yet.{' '}
                <button onClick={() => syncMutation.mutate()} className="text-indigo-600 hover:underline">
                  Sync now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active Repositories */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-700">
            <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              📊 Active Repositories <span className="text-xs text-gray-500 font-normal">(By commits, last 30 days)</span>
            </h2>
          </div>
          <div className="divide-y dark:divide-gray-700">
            {stats?.active_repos?.length ? (
              stats.active_repos.map((repo) => (
                <div key={repo.full_name} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <a 
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-64 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    {repo.full_name}
                  </a>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{repo.commits_count} commits</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{repo.prs_count} PRs</span>
                    {repo.open_prs > 0 && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{repo.open_prs} open</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-400">
                No tracked repos yet.{' '}
                <a href="/github/repos" className="text-indigo-600 hover:underline">
                  Manage repos
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-bold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/github/prs" className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition font-medium text-sm">
            🔀 View All PRs
          </a>
          <a href="/github/repos" className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition font-medium text-sm">
            📁 Manage Repos
          </a>
          <a href="/github/reviews/new" className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-medium text-sm">
            ➕ Submit Peer Review
          </a>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'emerald' | 'pink';
}

const StatCard = ({ title, value, subtitle, icon, color }: StatCardProps) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    emerald: 'from-emerald-500 to-emerald-600',
    pink: 'from-pink-500 to-pink-600',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} opacity-20`}></div>
      </div>
      <p className="text-2xl font-bold text-gray-800 dark:text-white">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-500">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
};

export default GitHubDashboard;
