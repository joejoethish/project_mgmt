import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AdvancedTable, AdvancedTableColumn, BulkAction, RowAction } from '../../components/tables/AdvancedTable';
import SetRoleModal from '../../components/hr/SetRoleModal';

interface Employee {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone: string;
    profile_image: string;
    status: string;
    employment_type: string;
    department: string;
    department_name: string;
    department_category: string;
    designation: string;
    designation_name: string;
    designation_level: number;
    reporting_manager: string;
    manager_name: string;
    date_of_joining: string;
    invitation_status: string; // 'Joined', 'Invited', 'Not Invited'
    pm_member_id: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.1.26:8000/api/pm';
const HR_API_BASE = 'http://192.168.1.26:8000/api/hr';

export default function EmployeeList() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

    const fetchEmployees = () => {
        setLoading(true);
        axios.get(`${HR_API_BASE}/employees/`)
            .then(res => setEmployees(res.data))
            .catch(() => toast.error('Failed to load data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    // Actions
    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        try {
            await axios.delete(`${HR_API_BASE}/employees/${id}/`);
            toast.success('Employee deleted');
            setEmployees(employees.filter(e => e.id !== id));
        } catch {
            toast.error('Failed to delete');
        }
    };

    const handleBulkInvite = async (selectedRows: Employee[]) => {
        const memberIds = selectedRows
            .map(e => e.pm_member_id)
            .filter(Boolean); // Filter out nulls/undefined

        if (memberIds.length === 0) {
            toast.error("Selected employees are not linked to Member records.");
            return;
        }

        const toastId = toast.loading("Sending invitations...");
        try {
            const res = await axios.post(`${API_BASE}/auth/invite/bulk/`, {
                member_ids: memberIds,
                reset_url: window.location.origin + '/accept-invite'
            });
            toast.success(res.data.message, { id: toastId });
            fetchEmployees(); // Refresh to show 'Invited' status
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to send invites", { id: toastId });
        }
    };

    const openRoleModal = (selectedRows: Employee[]) => {
        const memberIds = selectedRows
            .map(e => e.pm_member_id)
            .filter(Boolean);
        
        if (memberIds.length === 0) {
            toast.error("Selected employees are not linked to Member records.");
            return;
        }
        
        setSelectedMemberIds(memberIds);
        setIsRoleModalOpen(true);
    };

    const handleSaveRole = async (roleId: string) => {
        try {
            await axios.post(`${API_BASE}/auth/role/bulk/`, {
                member_ids: selectedMemberIds,
                role_id: roleId
            });
            toast.success("Roles updated successfully");
            // Optionally refresh if we showed roles in the table
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to update roles");
        }
    };


    const columns: AdvancedTableColumn<Employee>[] = useMemo(() => [
        {
            key: 'full_name',
            header: 'Employee',
            sortable: true,
            render: (_, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium shrink-0">
                        {row.profile_image ? (
                            <img src={row.profile_image} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            (row.first_name?.[0] || '') + (row.last_name?.[0] || '')
                        )}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                            {row.first_name} {row.last_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {row.employee_code} • {row.email}
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: 'department_name',
            header: 'Department',
            sortable: true,
            render: (val, row) => (
                <div>
                   <div className="text-gray-900 dark:text-white">{String(val || '-')}</div>
                   {row.department_category && (
                       <span className="text-xs text-gray-500 capitalize">{row.department_category}</span>
                   )}
                </div>
            )
        },
        {
            key: 'designation_name',
            header: 'Designation',
            sortable: true
        },
        {
            key: 'status',
            header: 'Status',
            render: (val) => {
                const colors: Record<string, string> = {
                    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
                    on_leave: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                    terminated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                    resigned: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
                };
                return (
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[String(val)] || colors['inactive']}`}>
                        {String(val).replace('_', ' ').toUpperCase()}
                    </span>
                );
            }
        },
        {
            key: 'invitation_status',
            header: 'Invite Status',
            render: (val) => {
                const status = String(val || 'Not Invited');
                let color = 'bg-gray-100 text-gray-600';
                if (status === 'Joined') color = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                if (status === 'Invited') color = 'bg-amber-100 text-amber-800 border border-amber-200';
                if (status === 'Not In Member DB') color = 'bg-red-50 text-red-500';

                return (
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${color}`}>
                        {status}
                    </span>
                );
            }
        },
        {
            key: 'manager_name',
            header: 'Manager'
        }
    ], []);

    const bulkActions: BulkAction<Employee>[] = [
        {
            label: 'Send Invite',
            onClick: handleBulkInvite,
            variant: 'default'
        },
        {
            label: 'Set Role',
            onClick: openRoleModal,
            variant: 'default'
        },
        {
            label: 'Delete',
            onClick: (rows) => {
                if(confirm(`Delete ${rows.length} employees?`)) {
                    // Logic for bulk delete not fully implemented in backend yet, doing one by one or skipping for now
                    toast.error("Bulk delete not implemented yet");
                }
            },
            variant: 'danger'
        }
    ];

    const rowActions: RowAction<Employee>[] = [
        {
            label: 'Edit',
            onClick: (row) => navigate(`/hr/employees/${row.id}`)
        },
        {
            label: 'Delete',
            onClick: (row) => handleDelete(row.id, row.full_name),
            variant: 'danger'
        }
    ];


    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                     <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage workforce and invitations
                    </p>
                </div>
                 <button
                    onClick={() => navigate('/hr/employees/new')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Employee
                </button>
            </div>

            <AdvancedTable<Employee>
                data={employees}
                columns={columns}
                enableSearch={true}
                enablePagination={true}
                enableSelection={true}
                enableExport={true}
                enableColumnVisibility={true}
                rowKey="id"
                bulkActions={bulkActions}
                rowActions={rowActions}
                loading={loading}
                emptyTitle="No employees found"
            />

            <SetRoleModal 
                isOpen={isRoleModalOpen}
                onClose={() => setIsRoleModalOpen(false)}
                onSave={handleSaveRole}
                memberCount={selectedMemberIds.length}
            />
        </div>
    );
}


