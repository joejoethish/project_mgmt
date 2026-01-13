import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';

const API_BASE = 'http://192.168.1.26:8000/api/github';

interface Organization {
  org_id: string;
  name: string;
  is_active: boolean;
  last_sync: string | null;
  repository_count: number;
  tracked_repos_count: number;
  created_at: string;
}

const OrganizationList = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', github_token: '' });
  const [syncingOrg, setSyncingOrg] = useState<string | null>(null);

  const { data: orgs, isLoading, error } = useQuery<Organization[]>({
    queryKey: ['github-orgs'],
    queryFn: async () => (await axios.get(`${API_BASE}/organizations/`)).data
  });

  // Add organization mutation
  const addMutation = useMutation({
    mutationFn: async (data: { name: string; github_token: string }) => {
      return axios.post(`${API_BASE}/organizations/`, data);
    },
    onSuccess: () => {
      toast.success('Organization added!');
      queryClient.invalidateQueries({ queryKey: ['github-orgs'] });
      setShowAddModal(false);
      setNewOrg({ name: '', github_token: '' });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to add organization');
    }
  });

  // Sync organization mutation
  const syncMutation = useMutation({
    mutationFn: async (orgId: string) => {
      setSyncingOrg(orgId);
      return axios.post(`${API_BASE}/organizations/${orgId}/sync/`);
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Sync complete!');
      queryClient.invalidateQueries({ queryKey: ['github-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['github-repos'] });
      setSyncingOrg(null);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Sync failed');
      setSyncingOrg(null);
    }
  });

  // Delete organization mutation
  const deleteMutation = useMutation({
    mutationFn: async (orgId: string) => {
      return axios.delete(`${API_BASE}/organizations/${orgId}/`);
    },
    onSuccess: () => {
      toast.success('Organization removed');
      queryClient.invalidateQueries({ queryKey: ['github-orgs'] });
    },
    onError: () => {
      toast.error('Failed to remove organization');
    }
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrg.name || !newOrg.github_token) {
      toast.error('Please fill in all fields');
      return;
    }
    addMutation.mutate(newOrg);
  };

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
        Failed to load organizations
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <span className="text-3xl">🏢</span> GitHub Organizations
          </h1>
          <p className="text-gray-500 mt-1">Manage connected GitHub organizations and sync repositories</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <span>➕</span> Add Organization
        </button>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orgs?.map((org) => (
          <div
            key={org.org_id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white">{org.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${org.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {org.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-600">{org.repository_count}</p>
                  <p className="text-xs text-gray-500">Repos</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{org.tracked_repos_count}</p>
                  <p className="text-xs text-gray-500">Tracked</p>
                </div>
              </div>

              <div className="text-sm text-gray-500 mb-4">
                <span className="font-medium">Last Sync:</span>{' '}
                {org.last_sync ? new Date(org.last_sync).toLocaleString() : 'Never'}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => syncMutation.mutate(org.org_id)}
                  disabled={syncingOrg === org.org_id}
                  className="flex-1 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {syncingOrg === org.org_id ? (
                    <>
                      <span className="animate-spin">⏳</span> Syncing...
                    </>
                  ) : (
                    <>
                      <span>🔄</span> Sync Repos
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${org.name}?`)) {
                      deleteMutation.mutate(org.org_id);
                    }
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                  title="Delete organization"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}

        {orgs?.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <p className="text-6xl mb-4">🏢</p>
            <p className="text-lg">No organizations added yet</p>
            <p className="text-sm mt-2">Click "Add Organization" to connect your GitHub account</p>
          </div>
        )}
      </div>

      {/* Add Organization Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Add GitHub Organization</h2>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  placeholder="e.g., my-company"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Exact GitHub org/user name (as in URL)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Personal Access Token *
                </label>
                <input
                  type="password"
                  value={newOrg.github_token}
                  onChange={(e) => setNewOrg({ ...newOrg, github_token: e.target.value })}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Token with `repo` and `read:org` scopes</p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {addMutation.isPending ? 'Adding...' : 'Add Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationList;
