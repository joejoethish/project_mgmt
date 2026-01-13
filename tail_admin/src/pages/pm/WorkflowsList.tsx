import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function WorkflowsList() {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [deleteModal, setDeleteModal] = useState<{
        open: boolean;
        statusId: string | null;
        count: number;
        suggestedId: string | null;
        allStatuses: any[];
  }>({ open: false, statusId: null, count: 0, suggestedId: null, allStatuses: [] });
  const [targetStatus, setTargetStatus] = useState<string>('');

  const handleDelete = async (id: string) => {
    if(!confirm('Delete status?')) return;
    try {
        await axios.delete(`http://192.168.1.26:8000/api/pm/taskstatuses/${id}/`);
        setStatuses(statuses.filter((s: any) => s.task_status_id !== id));
        toast.success('Status deleted');
    } catch (e: any) {
        if (e.response && e.response.status === 409) {
            const data = e.response.data;
            setDeleteModal({
                open: true,
                statusId: id,
                count: data.count,
                suggestedId: data.suggested_id,
                allStatuses: data.all_statuses
            });
            setTargetStatus(data.suggested_id || (data.all_statuses.length > 0 ? data.all_statuses[0].task_status_id : ''));
        } else {
             toast.error(e.response?.data?.error || 'Failed to delete');
        }
    }
  };

  const confirmDelete = async () => {
      if (!deleteModal.statusId || !targetStatus) return;
      try {
          await axios.delete(`http://192.168.1.26:8000/api/pm/taskstatuses/${deleteModal.statusId}/?transfer_to=${targetStatus}`);
          setStatuses(statuses.filter((s: any) => s.task_status_id !== deleteModal.statusId));
          toast.success('Status deleted and tasks reassigned');
          setDeleteModal({ ...deleteModal, open: false });
      } catch (e: any) {
          toast.error('Failed to delete');
      }
  };

  useEffect(() => {
    axios.get("http://192.168.1.26:8000/api/pm/taskstatuses/?ordering=sort_order")
      .then((res) => setStatuses(res.data))
      .catch(() => toast.error("Failed to load statuses"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 bg-white dark:bg-gray-900 min-h-screen relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Workflows (Task Statuses)</h1>
        <button onClick={() => navigate('/pm/workflows/new')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + New Status
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3">Order</th>
              <th className="px-6 py-3">Status Name</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {statuses.map((status: any) => (
              <tr key={status.task_status_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4">{status.sort_order}</td>
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {status.name}
                    {!status.is_active && <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full dark:bg-red-900 dark:text-red-200">Inactive</span>}
                    {status.is_default === 1 && <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">Default</span>}
                </td>
                <td className="px-6 py-4">{status.description}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => navigate(`/pm/workflows/${status.task_status_id}`)} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                  <button onClick={() => handleDelete(status.task_status_id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>}
            {!loading && statuses.length === 0 && (
                <tr><td colSpan={4} className="text-center py-4">No statuses defined.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Reassignment Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-lg font-bold mb-4 dark:text-white">⚠️ Tasks Assigned</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    There are <strong>{deleteModal.count} tasks</strong> currently in this status. 
                    Deleting it will require moving these tasks to another status.
                </p>
                
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Move tasks to:</label>
                    <select 
                        value={targetStatus} 
                        onChange={(e) => setTargetStatus(e.target.value)}
                        className="w-full rounded border px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        {deleteModal.allStatuses.map((s) => (
                            <option key={s.task_status_id} value={s.task_status_id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setDeleteModal({...deleteModal, open: false})}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Confirm Delete & Move
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

