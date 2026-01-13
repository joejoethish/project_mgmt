import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = 'http://192.168.1.26:8000/api/pm';

interface ZohoStats {
  boards: { total: number; mapped: number };
  statuses: { total: number; mapped: number };
  members: { total: number; mapped: number };
  tasks: { total: number; synced: number; unsynced: number };
  logs: { processed: number; total_api: number };
  recent_syncs: any[];
}

interface ZohoBoard {
  board_id: string;
  zoho_board_id: string;
  zoho_board_name: string;
  mapped_project: string | null;
  mapped_project_name: string | null;
  sections_count: number;
  tasks_count: number;
}

interface ZohoStatus {
  status_id: string;
  zoho_status_id: string;
  zoho_status_name: string;
  color_type: string;
  board_name: string | null;
  mapped_status: string | null;
  mapped_status_name: string | null;
}

interface ZohoMember {
  member_id: string;
  zoho_user_id: string;
  zoho_name: string;
  zoho_email: string;
  mapped_member: string | null;
  mapped_member_name: string | null;
}

interface ZohoTask {
  id: string;
  zoho_task_id: string;
  title: string;
  board_name: string;
  status_name: string;
  priority_name: string;
  category_name: string;
  trigger_type: string;
  triggered_by_name: string;
  triggered_time: string;
  is_synced: boolean;
  assignee_names: string[];
}

interface Project {
  project_id: string;
  name: string;
}

interface TaskStatus {
  status_id: string;
  name: string;
}

interface Member {
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function ZohoIntegrationPage() {
  const [stats, setStats] = useState<ZohoStats | null>(null);
  const [boards, setBoards] = useState<ZohoBoard[]>([]);
  const [zohoStatuses, setZohoStatuses] = useState<ZohoStatus[]>([]);
  const [zohoMembers, setZohoMembers] = useState<ZohoMember[]>([]);
  const [tasks, setTasks] = useState<ZohoTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mapping' | 'tasks'>('dashboard');
  const [mappingTab, setMappingTab] = useState<'boards' | 'statuses' | 'members'>('boards');
  const [pullStatus, setPullStatus] = useState<string>('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [filterSynced, setFilterSynced] = useState<'all' | 'synced' | 'unsynced'>('all');
  
  // Batch sync progress state
  const [syncProgress, setSyncProgress] = useState<{
    offset: number;
    total: number;
    hasMore: boolean;
    lastBatch: number;
  } | null>(null);
  
  // Mapping filter states
  const [statusSearch, setStatusSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);  // Auto-sync toggle

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get<ZohoStats>(`${API_BASE}/zoho/stats/`);
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchBoards = useCallback(async () => {
    try {
      const res = await axios.get<ZohoBoard[]>(`${API_BASE}/zoho/boards/`);
      setBoards(res.data);
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    }
  }, []);

  const fetchZohoStatuses = useCallback(async () => {
    try {
      const res = await axios.get<ZohoStatus[]>(`${API_BASE}/zoho/statuses/`);
      setZohoStatuses(res.data);
    } catch (error) {
      console.error('Failed to fetch zoho statuses:', error);
    }
  }, []);

  const fetchZohoMembers = useCallback(async () => {
    try {
      const res = await axios.get<ZohoMember[]>(`${API_BASE}/zoho/members/`);
      setZohoMembers(res.data);
    } catch (error) {
      console.error('Failed to fetch zoho members:', error);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      let url = `${API_BASE}/zoho/tasks/`;
      if (filterSynced !== 'all') {
        url += `?is_synced=${filterSynced === 'synced'}`;
      }
      const res = await axios.get<ZohoTask[]>(url);
      setTasks(res.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }, [filterSynced]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get<Project[]>(`${API_BASE}/projects/`);
      setProjects(res.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  const fetchTaskStatuses = useCallback(async () => {
    try {
      const res = await axios.get<TaskStatus[]>(`${API_BASE}/taskstatuses/`);
      setTaskStatuses(res.data);
    } catch (error) {
      console.error('Failed to fetch task statuses:', error);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await axios.get<Member[]>(`${API_BASE}/members/`);
      setMembers(res.data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchStats(),
      fetchBoards(),
      fetchZohoStatuses(),
      fetchZohoMembers(),
      fetchProjects(),
      fetchTaskStatuses(),
      fetchMembers(),
      fetchTasks()
    ]);
  }, [fetchStats, fetchBoards, fetchZohoStatuses, fetchZohoMembers, fetchProjects, fetchTaskStatuses, fetchMembers, fetchTasks]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const pullWebhooks = async (continueFromOffset = 0) => {
    setLoading(true);
    const isInitial = continueFromOffset === 0;
    setPullStatus(isInitial ? 'Starting batch sync...' : `Continuing from item ${continueFromOffset}...`);
    
    try {
      const res = await axios.post(`${API_BASE}/zoho/pull-webhooks/`, {
        batch_size: 200,
        offset: continueFromOffset,
        auto_sync: autoSyncEnabled
      });
      
      const { total_in_api, batch_fetched, processed, created, updated, new_offset, has_more, remaining, auto_synced } = res.data;
      
      setSyncProgress({
        offset: new_offset,
        total: total_in_api,
        hasMore: has_more,
        lastBatch: batch_fetched
      });
      
      const autoSyncMsg = auto_synced > 0 ? ` 🚀 Auto-synced ${auto_synced} tasks!` : '';
      
      if (has_more) {
        setPullStatus(`✅ Batch synced: ${processed} items (${new_offset}/${total_in_api}). Created: ${created}, Updated: ${updated}. 📦 ${remaining} remaining${autoSyncMsg}`);
      } else {
        setPullStatus(`🎉 Sync complete! Total: ${new_offset} items processed. Created: ${created}, Updated: ${updated}${autoSyncMsg}`);
        setSyncProgress(null);
      }
      
      await fetchAll();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      setPullStatus(`❌ Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const resetSyncProgress = () => {
    setSyncProgress(null);
    setPullStatus('');
  };

  const resetAllZohoData = async () => {
    const confirmText = 'DELETE ALL ZOHO DATA';
    const userInput = window.prompt(
      `⚠️ WARNING: This will delete ALL Zoho data!\n\n` +
      `This includes:\n` +
      `• All Zoho Boards and Sections\n` +
      `• All Zoho Statuses and Members\n` +
      `• All Zoho Tasks\n` +
      `• All Sync Logs\n` +
      `• All Mappings\n\n` +
      `PM Tasks will NOT be deleted, but their Zoho links will be broken.\n\n` +
      `Type "${confirmText}" to confirm:`
    );
    
    if (userInput !== confirmText) {
      if (userInput !== null) {
        setPullStatus('❌ Reset cancelled - confirmation text did not match');
      }
      return;
    }
    
    setLoading(true);
    setPullStatus('🗑️ Resetting all Zoho data...');
    
    try {
      const res = await axios.post(`${API_BASE}/zoho/reset/`, { confirm: true });
      const { deleted } = res.data;
      setPullStatus(
        `✅ Reset complete! Deleted: ${deleted.tasks} tasks, ${deleted.boards} boards, ` +
        `${deleted.statuses} statuses, ${deleted.members} members, ${deleted.sync_logs} logs`
      );
      setSyncProgress(null);
      await fetchAll();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      setPullStatus(`❌ Reset failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fastTrackProjects = async () => {
    if (!window.confirm('Create PM Projects for all unmapped Zoho Boards?')) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/zoho/boards/fast_track_projects/`);
      setPullStatus(`✅ Success: Created ${res.data.created} PM projects.`);
      await fetchAll();
    } catch (error) {
      console.error('Fast track projects failed:', error);
      setPullStatus('❌ Failed to auto-create projects');
    } finally {
      setLoading(false);
    }
  };

  const fastTrackStatuses = async () => {
    if (!window.confirm('Create PM Task Statuses for all unique Zoho status names?')) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/zoho/statuses/fast_track_statuses/`);
      setPullStatus(`✅ Success: Created ${res.data.created} PM statuses.`);
      await fetchAll();
    } catch (error) {
      console.error('Fast track statuses failed:', error);
      setPullStatus('❌ Failed to auto-create statuses');
    } finally {
      setLoading(false);
    }
  };

  const bulkSyncToPM = async () => {
    setLoading(true);
    setPullStatus('🚀 Starting bulk sync to PM tasks...');
    try {
      const res = await axios.post(`${API_BASE}/zoho/tasks/bulk_sync_to_pm/`);
      setPullStatus(`🎉 Bulk sync complete! Synced: ${res.data.synced}, Failed: ${res.data.failed}`);
      await fetchAll();
    } catch (error) {
      console.error('Bulk sync failed:', error);
      setPullStatus('❌ Bulk sync failed');
    } finally {
      setLoading(false);
    }
  };

  const mapBoardToProject = async (boardId: string, projectId: string | null) => {
    try {
      await axios.post(`${API_BASE}/zoho/boards/map_to_project/`, {
        board_id: boardId,
        mapped_project_id: projectId || null
      });
      fetchBoards();
      fetchStats();
    } catch (error) {
      console.error('Failed to map board:', error);
    }
  };

  const mapStatusToTaskStatus = async (statusId: string, pmStatusId: string | null) => {
    try {
      await axios.post(`${API_BASE}/zoho/statuses/map_to_status/`, {
        status_id: statusId,
        mapped_status_id: pmStatusId || null
      });
      fetchZohoStatuses();
      fetchStats();
    } catch (error) {
      console.error('Failed to map status:', error);
    }
  };

  const mapMemberToPmMember = async (memberId: string, pmMemberId: string | null) => {
    try {
      await axios.post(`${API_BASE}/zoho/members/map_to_member/`, {
        member_id: memberId,
        mapped_member_id: pmMemberId || null
      });
      fetchZohoMembers();
      fetchStats();
    } catch (error) {
      console.error('Failed to map member:', error);
    }
  };

  const autoMapMembers = async () => {
    setLoading(true);
    try {
      const res = await axios.post<{ mapped: number; already_mapped: number; not_found: any[] }>(`${API_BASE}/zoho/members/auto_map/`);
      setPullStatus(`✅ Auto-mapped ${res.data.mapped} members. Already mapped: ${res.data.already_mapped}. Not found: ${res.data.not_found.length}`);
      fetchZohoMembers();
      fetchStats();
    } catch (error: unknown) {
      const err = error as Error;
      setPullStatus(`❌ Auto-map error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const autoMapStatuses = async () => {
    setLoading(true);
    try {
      const res = await axios.post<{ mapped: number; already_mapped: number; not_found: any[] }>(`${API_BASE}/zoho/statuses/auto_map/`);
      setPullStatus(`✅ Auto-mapped ${res.data.mapped} statuses. Already mapped: ${res.data.already_mapped}. Not found: ${res.data.not_found.length}`);
      fetchZohoStatuses();
      fetchStats();
    } catch (error: unknown) {
      const err = error as Error;
      setPullStatus(`❌ Auto-map error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const syncSelectedTasks = async () => {
    if (selectedTasks.size === 0) return;
    setLoading(true);
    try {
      const res = await axios.post<{ synced: number; failed: number }>(`${API_BASE}/zoho/tasks/bulk_sync/`, {
        task_ids: Array.from(selectedTasks)
      });
      setPullStatus(`✅ Synced ${res.data.synced} tasks. Failed: ${res.data.failed}`);
      setSelectedTasks(new Set());
      fetchTasks();
      fetchStats();
    } catch (error: unknown) {
      const err = error as Error;
      setPullStatus(`❌ Sync error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };

  const selectAllTasks = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🔗 Zoho Connect Integration</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Sync tasks from Zoho Connect to your PM system</p>
        </div>
        <div className="flex gap-2">
          {(!syncProgress || (stats && stats.logs.processed >= stats.logs.total_api)) && (
            <button
              onClick={() => pullWebhooks(0)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              title="Start a new sync from the very beginning"
            >
              🚀 {stats && stats.logs.processed > 0 ? 'Restart' : 'Pull Webhook Data'}
            </button>
          )}

          {(syncProgress || (stats && stats.logs.processed < stats.logs.total_api && stats.logs.total_api > 0)) && (
            <div className="flex bg-green-50 dark:bg-green-900/10 rounded-lg p-0.5 border border-green-200 dark:border-green-800">
              <button
                onClick={() => pullWebhooks(syncProgress?.offset || stats?.logs.processed || 0)}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-l-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                ▶️ Continue ({stats ? stats.logs.total_api - stats.logs.processed : syncProgress?.total ? syncProgress.total - syncProgress.offset : '...'} left)
              </button>
              <div className="w-[1px] bg-green-700/30"></div>
              <button
                onClick={() => pullWebhooks(syncProgress?.offset || stats?.logs.processed || 0, 200)}
                disabled={loading}
                className="px-3 py-2 bg-green-600/90 text-white rounded-r-lg hover:bg-green-700 disabled:opacity-50 text-xs font-bold"
                title="Pull next 200 items"
              >
                (200)
              </button>
            </div>
          )}

          {stats && stats.logs.processed > 0 && stats.logs.processed >= stats.logs.total_api && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
              🎉 All {stats.logs.total_api} logs synced!
            </div>
          )}

          {stats && stats.tasks.unsynced > 0 && stats.boards.mapped > 0 && stats.statuses.mapped > 0 && (
            <button
              onClick={bulkSyncToPM}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 animate-pulse"
              title="Sync all un-mapped tasks to PM"
            >
              🔄 Sync All Tasks
            </button>
          )}

          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

          <button
            onClick={resetAllZohoData}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            title="Delete all Zoho data and start fresh"
          >
            🗑️ Reset All
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {syncProgress && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">
              Sync Progress: {syncProgress.offset} / {syncProgress.total}
            </span>
            <span className="text-blue-600 font-medium">
              {Math.round((syncProgress.offset / syncProgress.total) * 100)}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
              style={{ width: `${(syncProgress.offset / syncProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Message */}
      {pullStatus && (
        <div className={`mb-4 p-3 rounded-lg ${
          pullStatus.startsWith('✅') || pullStatus.startsWith('🎉') 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : pullStatus.startsWith('❌') 
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        }`}>
          {pullStatus}
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex gap-1 mb-6 border-b dark:border-gray-700">
        {(['dashboard', 'mapping', 'tasks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize ${activeTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {tab === 'mapping' ? '🔗 Field Mapping' : tab === 'tasks' ? '📋 Tasks' : '📊 Dashboard'}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <div className="text-3xl">🔄</div>
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded">
                {stats ? Math.round((stats.logs.processed / (stats.logs.total_api || 1)) * 100) : 0}%
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.logs.processed.toLocaleString()}
            </div>
            <div className="text-gray-500 dark:text-gray-400">Logs Synced</div>
            <div className="text-xs text-gray-400 mt-1 italic">
              of {stats.logs.total_api.toLocaleString()} total
            </div>
          </div>
          
          {/* Boards Card with progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="text-2xl">📋</div>
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${stats.boards.mapped === stats.boards.total ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {stats.boards.total > 0 ? Math.round((stats.boards.mapped / stats.boards.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.boards.total} Boards</div>
            <div className="flex items-center gap-2 text-xs mt-2">
              <span className="text-green-600">✓ {stats.boards.mapped} mapped</span>
              {stats.boards.total - stats.boards.mapped > 0 && (
                <span className="text-orange-500">• {stats.boards.total - stats.boards.mapped} unmapped</span>
              )}
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.boards.total > 0 ? (stats.boards.mapped / stats.boards.total) * 100 : 0}%` }} />
            </div>
          </div>
          
          {/* Statuses Card with progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="text-2xl">🏷️</div>
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${stats.statuses.mapped === stats.statuses.total ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {stats.statuses.total > 0 ? Math.round((stats.statuses.mapped / stats.statuses.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.statuses.total} Statuses</div>
            <div className="flex items-center gap-2 text-xs mt-2">
              <span className="text-green-600">✓ {stats.statuses.mapped} mapped</span>
              {stats.statuses.total - stats.statuses.mapped > 0 && (
                <span className="text-orange-500">• {stats.statuses.total - stats.statuses.mapped} unmapped</span>
              )}
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.statuses.total > 0 ? (stats.statuses.mapped / stats.statuses.total) * 100 : 0}%` }} />
            </div>
          </div>
          
          {/* Members Card with progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="text-2xl">👥</div>
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${stats.members.mapped === stats.members.total ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {stats.members.total > 0 ? Math.round((stats.members.mapped / stats.members.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.members.total} Members</div>
            <div className="flex items-center gap-2 text-xs mt-2">
              <span className="text-green-600">✓ {stats.members.mapped} mapped</span>
              {stats.members.total - stats.members.mapped > 0 && (
                <span className="text-orange-500">• {stats.members.total - stats.members.mapped} unmapped</span>
              )}
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.members.total > 0 ? (stats.members.mapped / stats.members.total) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Tasks Sync Status - Key Metric */}
          <div className="col-span-full bg-gradient-to-r from-purple-50 via-white to-green-50 dark:from-purple-900/20 dark:via-gray-800 dark:to-green-900/20 rounded-xl p-6 shadow-sm border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  📊 Tasks Sync Status
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Zoho tasks imported to your PM system
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Auto-sync toggle */}
                <label className="flex items-center gap-2 cursor-pointer group" title="When enabled, new tasks are automatically synced to PM during webhook pulls">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={autoSyncEnabled}
                      onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${autoSyncEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoSyncEnabled ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                    Auto-sync
                  </span>
                </label>
                
                {/* Sync All button */}
                {stats.tasks.unsynced > 0 && stats.boards.mapped > 0 && stats.statuses.mapped > 0 && (
                  <button
                    onClick={bulkSyncToPM}
                    disabled={loading}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg shadow-purple-500/20"
                  >
                    <span className="text-lg">🚀</span>
                    Sync All {stats.tasks.unsynced} New Tasks
                  </button>
                )}
              </div>
            </div>
            
            {/* Progress visualization */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.tasks.total}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Total Tasks</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center shadow-sm border border-green-200 dark:border-green-700">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.tasks.synced}</div>
                <div className="text-xs text-green-600 uppercase tracking-wide">✓ Synced to PM</div>
              </div>
              <div className={`rounded-lg p-4 text-center shadow-sm border ${stats.tasks.unsynced > 0 ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                <div className={`text-3xl font-bold ${stats.tasks.unsynced > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`}>{stats.tasks.unsynced}</div>
                <div className={`text-xs uppercase tracking-wide ${stats.tasks.unsynced > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {stats.tasks.unsynced > 0 ? '⏳ Pending Sync' : '✓ All Synced'}
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="relative">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${stats.tasks.total > 0 ? (stats.tasks.synced / stats.tasks.total) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-500">0</span>
                <span className="text-gray-500 font-medium">
                  {stats.tasks.total > 0 ? Math.round((stats.tasks.synced / stats.tasks.total) * 100) : 0}% synced
                </span>
                <span className="text-gray-500">{stats.tasks.total}</span>
              </div>
            </div>

            {/* Requirements check */}
            {stats.tasks.unsynced > 0 && (stats.boards.mapped === 0 || stats.statuses.mapped === 0) && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                ⚠️ Before syncing tasks, you need to:
                {stats.boards.mapped === 0 && <span className="block ml-4">• Map at least one Board → Project</span>}
                {stats.statuses.mapped === 0 && <span className="block ml-4">• Map at least one Status → Task Status</span>}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="col-span-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-blue-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">🚀 Quick Start Guide</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0">1</span>
                <span className="text-gray-600 dark:text-gray-300">Click <strong>Pull Webhook Data</strong> to fetch from Zoho</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0">2</span>
                <span className="text-gray-600 dark:text-gray-300">Go to <strong>Field Mapping</strong> to link Zoho → PM fields</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0">3</span>
                <span className="text-gray-600 dark:text-gray-300">Map Boards, Statuses, and Members</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0">4</span>
                <span className="text-gray-600 dark:text-gray-300">Click <strong>Sync All New Tasks</strong> above 👆</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Tab */}
      {activeTab === 'mapping' && (
        <div className="flex flex-col h-[calc(100vh-320px)]">
          {/* Sub-tabs for mapping types with unmapped badges */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMappingTab('boards')}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${mappingTab === 'boards' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              📋 Boards → Projects
              {boards.filter(b => !b.mapped_project).length > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-orange-500 text-white">
                  {boards.filter(b => !b.mapped_project).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setMappingTab('statuses')}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${mappingTab === 'statuses' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              🏷️ Statuses
              {zohoStatuses.filter(s => !s.mapped_status).length > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-orange-500 text-white">
                  {zohoStatuses.filter(s => !s.mapped_status).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setMappingTab('members')}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${mappingTab === 'members' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              👥 Members
              {zohoMembers.filter(m => !m.mapped_member).length > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-orange-500 text-white">
                  {zohoMembers.filter(m => !m.mapped_member).length}
                </span>
              )}
            </button>
          </div>

          {/* Boards Mapping */}
          {mappingTab === 'boards' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center justify-between border-b dark:border-gray-600">
                <div className="grid grid-cols-2 flex-1 font-medium text-sm">
                  <div className="text-blue-700 dark:text-blue-300 border-r dark:border-gray-600">
                    🔗 Zoho Connect Boards
                  </div>
                  <div className="px-4 text-green-700 dark:text-green-300">
                    📁 PM Projects
                  </div>
                </div>
                {boards.filter(b => !b.mapped_project).length > 0 && (
                  <button
                    onClick={fastTrackProjects}
                    disabled={loading}
                    className="ml-4 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    ⚡ Auto-Create Projects
                  </button>
                )}
              </div>
              <div className="divide-y dark:divide-gray-700 overflow-y-auto flex-1">
                {boards.map(board => (
                  <div key={board.board_id} className="grid grid-cols-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="px-4 py-3 border-r dark:border-gray-600">
                      <div className="font-medium text-gray-900 dark:text-white">{board.zoho_board_name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {board.sections_count} sections • {board.tasks_count} tasks
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-center">
                      <select
                        value={board.mapped_project || ''}
                        onChange={(e) => mapBoardToProject(board.board_id, e.target.value || null)}
                        className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${board.mapped_project ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-300'}`}
                      >
                        <option value="">-- Select Project --</option>
                        {projects.map(p => (
                          <option key={p.project_id} value={p.project_id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                {boards.length === 0 && (
                  <div className="p-8 text-center text-gray-500 col-span-2">
                    No boards yet. Click "Pull Webhook Data" to import from Zoho.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statuses Mapping */}
          {mappingTab === 'statuses' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden flex flex-col flex-1 min-h-0">
              {/* Header with search and controls */}
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      placeholder="🔍 Search statuses..."
                      value={statusSearch}
                      onChange={(e) => setStatusSearch(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white w-48"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={showUnmappedOnly}
                        onChange={(e) => setShowUnmappedOnly(e.target.checked)}
                        className="rounded"
                      />
                      Show unmapped only
                    </label>
                  </div>
                    <button
                      onClick={autoMapStatuses}
                      disabled={loading}
                      className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      🔮 Auto-Map
                    </button>
                    <button
                      onClick={fastTrackStatuses}
                      disabled={loading}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      ⚡ Auto-Create
                    </button>
                  </div>
                  <div className="grid grid-cols-2 font-medium text-sm">
                    <div className="text-blue-700 dark:text-blue-300">🏷️ Zoho Status</div>
                    <div className="text-green-700 dark:text-green-300">📊 PM Task Status</div>
                  </div>
                </div>
              <div className="divide-y dark:divide-gray-700 overflow-y-auto flex-1">
                {Array.from(new Set(zohoStatuses.map(s => s.zoho_status_name)))
                  .filter(name => !statusSearch || name.toLowerCase().includes(statusSearch.toLowerCase()))
                  .map(name => {
                    // Find any instance of this status to get its mapping
                    const instances = zohoStatuses.filter(s => s.zoho_status_name === name);
                    const status = instances[0];
                    if (showUnmappedOnly && status.mapped_status) return null;

                    // Check if there's a matching PM status by name
                    const exactMatch = taskStatuses.find(ts => ts.name.toLowerCase() === name.toLowerCase());
                    return (
                      <div key={name} className={`grid grid-cols-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${!status.mapped_status ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}>
                        <div className="px-4 py-3 border-r dark:border-gray-600">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${status.mapped_status ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                            <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                            {exactMatch && !status.mapped_status && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                                Match found!
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 ml-4">
                            Appears in {instances.length} board{instances.length > 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="px-4 py-3 flex items-center gap-2">
                          {status.mapped_status ? (
                            /* Show mapped status name with edit capability */
                            <div className="flex items-center gap-2 flex-1">
                              <span className="px-3 py-2 bg-green-50 dark:bg-green-900/30 border border-green-500 rounded-lg text-green-700 dark:text-green-300 font-medium flex-1">
                                ✓ {status.mapped_status_name || 'Mapped'}
                              </span>
                              <button
                                onClick={() => mapStatusToTaskStatus(status.status_id, null)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                title="Unmap"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            /* Show dropdown for unmapped statuses */
                            <select
                              value=""
                              onChange={(e) => mapStatusToTaskStatus(status.status_id, e.target.value || null)}
                              className="flex-1 px-3 py-2 border border-orange-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                              <option value="">-- Select --</option>
                              {taskStatuses.map(s => (
                                <option key={s.status_id} value={s.status_id}>{s.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {zohoStatuses.length === 0 && (
                  <div className="p-8 text-center text-gray-500 col-span-2">
                    No statuses yet. Pull webhook data to see Zoho statuses.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Members Mapping */}
          {mappingTab === 'members' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden flex flex-col flex-1 min-h-0">
              {/* Header with search and controls */}
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      placeholder="🔍 Search by name or email..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white w-64"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={showUnmappedOnly}
                        onChange={(e) => setShowUnmappedOnly(e.target.checked)}
                        className="rounded"
                      />
                      Show unmapped only
                    </label>
                  </div>
                  <button
                    onClick={autoMapMembers}
                    disabled={loading}
                    className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    🔮 Auto-Map by Email
                  </button>
                </div>
                <div className="grid grid-cols-2 font-medium text-sm">
                  <div className="text-blue-700 dark:text-blue-300">👤 Zoho Member</div>
                  <div className="text-green-700 dark:text-green-300">👥 PM Member</div>
                </div>
              </div>
              <div className="divide-y dark:divide-gray-700 overflow-y-auto flex-1">
                {zohoMembers
                  .filter(m => !memberSearch || 
                    m.zoho_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                    m.zoho_email.toLowerCase().includes(memberSearch.toLowerCase())
                  )
                  .filter(m => !showUnmappedOnly || !m.mapped_member)
                  .map(member => {
                    // Check if there's a matching PM member by email
                    const emailMatch = members.find(pm => pm.email?.toLowerCase() === member.zoho_email?.toLowerCase());
                    return (
                      <div key={member.member_id} className={`grid grid-cols-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${!member.mapped_member ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}>
                        <div className="px-4 py-3 border-r dark:border-gray-600">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${member.mapped_member ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                            <span className="font-medium text-gray-900 dark:text-white">{member.zoho_name}</span>
                            {emailMatch && !member.mapped_member && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                                Email match!
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 ml-4">{member.zoho_email}</div>
                        </div>
                        <div className="px-4 py-3 flex items-center gap-2">
                          {member.mapped_member ? (
                            /* Show mapped member name with edit capability */
                            <div className="flex items-center gap-2 flex-1">
                              <span className="px-3 py-2 bg-green-50 dark:bg-green-900/30 border border-green-500 rounded-lg text-green-700 dark:text-green-300 font-medium flex-1">
                                ✓ {member.mapped_member_name || 'Mapped'}
                              </span>
                              <button
                                onClick={() => mapMemberToPmMember(member.member_id, null)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                title="Unmap"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            /* Show dropdown for unmapped members */
                            <select
                              value=""
                              onChange={(e) => mapMemberToPmMember(member.member_id, e.target.value || null)}
                              className="flex-1 px-3 py-2 border border-orange-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                              <option value="">-- Select --</option>
                              {members.map(m => (
                                <option key={m.member_id} value={m.member_id}>
                                  {m.first_name} {m.last_name} ({m.email})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {zohoMembers.length === 0 && (
                  <div className="p-8 text-center text-gray-500 col-span-2">
                    No members yet. Pull webhook data to see Zoho members.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mapping Summary - improved styling */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-blue-100 dark:border-gray-600 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">📊 Mapping Progress</h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {boards.filter(b => b.mapped_project).length + zohoStatuses.filter(s => s.mapped_status).length + zohoMembers.filter(m => m.mapped_member).length} / {boards.length + zohoStatuses.length + zohoMembers.length} total
              </span>
            </div>
            <div className="grid grid-cols-3 gap-6 mt-3">
              {/* Boards Progress */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">📋 Boards</span>
                  <span className={`font-medium ${boards.filter(b => b.mapped_project).length === boards.length && boards.length > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                    {boards.filter(b => b.mapped_project).length}/{boards.length}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${boards.filter(b => b.mapped_project).length === boards.length && boards.length > 0 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: boards.length > 0 ? `${(boards.filter(b => b.mapped_project).length / boards.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              
              {/* Statuses Progress */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">🏷️ Statuses</span>
                  <span className={`font-medium ${zohoStatuses.filter(s => s.mapped_status).length === zohoStatuses.length && zohoStatuses.length > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                    {zohoStatuses.filter(s => s.mapped_status).length}/{zohoStatuses.length}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${zohoStatuses.filter(s => s.mapped_status).length === zohoStatuses.length && zohoStatuses.length > 0 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: zohoStatuses.length > 0 ? `${(zohoStatuses.filter(s => s.mapped_status).length / zohoStatuses.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              
              {/* Members Progress */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">👥 Members</span>
                  <span className={`font-medium ${zohoMembers.filter(m => m.mapped_member).length === zohoMembers.length && zohoMembers.length > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                    {zohoMembers.filter(m => m.mapped_member).length}/{zohoMembers.length}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${zohoMembers.filter(m => m.mapped_member).length === zohoMembers.length && zohoMembers.length > 0 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: zohoMembers.length > 0 ? `${(zohoMembers.filter(m => m.mapped_member).length / zohoMembers.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div>
          {/* Filter & Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <select
                value={filterSynced}
                onChange={(e) => setFilterSynced(e.target.value as 'all' | 'synced' | 'unsynced')}
                className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Tasks</option>
                <option value="synced">Synced</option>
                <option value="unsynced">Unsynced</option>
              </select>
              <span className="text-gray-500">{tasks.length} tasks</span>
            </div>
            {selectedTasks.size > 0 && (
              <button
                onClick={syncSelectedTasks}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Sync {selectedTasks.size} Selected
              </button>
            )}
          </div>

          {/* Tasks Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTasks.size === tasks.length && tasks.length > 0}
                      onChange={selectAllTasks}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Board</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Assignees</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {tasks.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white truncate max-w-xs" title={task.title}>
                        {task.title}
                      </div>
                      <div className="text-xs text-gray-500">{task.triggered_by_name} • {task.trigger_type}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{task.board_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {task.status_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {task.assignee_names && task.assignee_names.length > 0 ? (
                          task.assignee_names.map((name, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded border dark:border-gray-600">
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{task.category_name || '-'}</td>
                    <td className="px-4 py-3">
                      {task.is_synced ? (
                        <span className="text-green-600">✓ Synced</span>
                      ) : (
                        <span className="text-orange-600">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tasks.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No tasks yet. Click "Pull Webhook Data" to import from Zoho.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


