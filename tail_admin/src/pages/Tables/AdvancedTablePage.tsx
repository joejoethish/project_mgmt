import { AdvancedTable, AdvancedTableColumn, RowAction, BulkAction, TableIcons, ExpandedRowContent } from "../../components/tables/AdvancedTable";
import Badge from "../../components/ui/badge/Badge";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useState } from "react";
import toast from "react-hot-toast";

// Sample employee data
interface Employee {
  [key: string]: unknown;
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  joinDate: string;
  salary: number;
  notes: string;
}

const initialData: Employee[] = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", department: "Engineering", status: "Active", joinDate: "2023-01-15", salary: 85000, notes: "Team lead" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Editor", department: "Marketing", status: "Active", joinDate: "2023-02-20", salary: 72000, notes: "Content lead" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "User", department: "Sales", status: "Inactive", joinDate: "2023-03-10", salary: 65000, notes: "On leave" },
  { id: 4, name: "Alice Brown", email: "alice@example.com", role: "User", department: "HR", status: "Pending", joinDate: "2023-04-05", salary: 58000, notes: "Probation" },
  { id: 5, name: "Charlie Wilson", email: "charlie@example.com", role: "Editor", department: "Engineering", status: "Active", joinDate: "2023-05-12", salary: 78000, notes: "Backend" },
  { id: 6, name: "Eva Davis", email: "eva@example.com", role: "Admin", department: "Finance", status: "Active", joinDate: "2023-06-18", salary: 92000, notes: "CFO" },
  { id: 7, name: "Frank Miller", email: "frank@example.com", role: "User", department: "Support", status: "Inactive", joinDate: "2023-07-25", salary: 52000, notes: "Contract" },
  { id: 8, name: "Grace Lee", email: "grace@example.com", role: "User", department: "Engineering", status: "Active", joinDate: "2023-08-30", salary: 68000, notes: "Full-stack" },
  { id: 9, name: "Henry Taylor", email: "henry@example.com", role: "Editor", department: "Marketing", status: "Pending", joinDate: "2023-09-14", salary: 62000, notes: "Approval" },
  { id: 10, name: "Ivy Martinez", email: "ivy@example.com", role: "User", department: "Sales", status: "Active", joinDate: "2023-10-22", salary: 71000, notes: "Top Q3" },
  { id: 11, name: "Jack Anderson", email: "jack@example.com", role: "Admin", department: "Engineering", status: "Active", joinDate: "2023-11-08", salary: 95000, notes: "CTO" },
  { id: 12, name: "Kate Thomas", email: "kate@example.com", role: "User", department: "HR", status: "Active", joinDate: "2023-12-15", salary: 55000, notes: "Recruiter" },
  { id: 13, name: "Leo Garcia", email: "leo@example.com", role: "User", department: "Engineering", status: "Active", joinDate: "2024-01-10", salary: 73000, notes: "DevOps" },
  { id: 14, name: "Maria Rodriguez", email: "maria@example.com", role: "Editor", department: "Marketing", status: "Active", joinDate: "2024-02-14", salary: 67000, notes: "Social" },
  { id: 15, name: "Nick Brown", email: "nick@example.com", role: "User", department: "Support", status: "Active", joinDate: "2024-03-20", salary: 54000, notes: "Tier 2" },
];

const getStatusColor = (status: string): "success" | "warning" | "error" => {
  if (status === "Active") return "success";
  if (status === "Pending") return "warning";
  return "error";
};

export default function AdvancedTablePage() {
  const [data, setData] = useState<Employee[]>(initialData);
  const [loading, setLoading] = useState(false);

  // Column definitions with ALL features
  const columns: AdvancedTableColumn<Employee>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      minWidth: 200,
      pinned: "left", // Pinned to left
      render: (_value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
            <span className="text-brand-600 dark:text-brand-400 font-medium text-sm">
              {String(row.name).split(" ").map(n => n[0]).join("")}
            </span>
          </div>
          <div>
            <span className="block font-medium text-gray-800 dark:text-white/90">{String(row.name)}</span>
            <span className="block text-gray-500 text-theme-xs dark:text-gray-400">{String(row.email)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      editable: true,
      groupable: true,
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      editable: true,
      groupable: true,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      groupable: true,
      render: (value) => (
        <Badge size="sm" color={getStatusColor(String(value))}>
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "salary",
      header: "Salary",
      sortable: true,
      aggregate: "sum", // Show sum in footer
      render: (value) => `$${Number(value).toLocaleString()}`,
    },
    {
      key: "joinDate",
      header: "Join Date",
      sortable: true,
      visible: false,
      render: (value) => {
        const date = new Date(String(value));
        return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      },
    },
  ];

  const rowActions: RowAction<Employee>[] = [
    {
      label: "View",
      icon: <TableIcons.View className="h-4 w-4" />,
      onClick: (row) => toast.success(`Viewing ${row.name}`),
    },
    {
      label: "Edit",
      icon: <TableIcons.Edit className="h-4 w-4" />,
      onClick: (row) => toast.success(`Editing ${row.name}`),
    },
    {
      label: "Delete",
      icon: <TableIcons.Trash className="h-4 w-4" />,
      variant: "danger",
      onClick: (row) => {
        setData(prev => prev.filter(r => r.id !== row.id));
        toast.success(`Deleted ${row.name}`);
      },
      show: (row) => row.role !== "Admin",
    },
  ];

  const bulkActions: BulkAction<Employee>[] = [
    {
      label: "Export",
      icon: <TableIcons.View className="h-4 w-4" />,
      onClick: (selectedRows) => toast.success(`Exporting ${selectedRows.length} employees`),
    },
    {
      label: "Delete",
      icon: <TableIcons.Trash className="h-4 w-4" />,
      variant: "danger",
      onClick: (selectedRows) => {
        const ids = new Set(selectedRows.map(r => r.id));
        setData(prev => prev.filter(r => !ids.has(r.id)));
        toast.success(`Deleted ${selectedRows.length} employees`);
      },
    },
  ];

  const expandedRowContent: ExpandedRowContent<Employee> = {
    render: (row) => (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{row.email}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">${Number(row.salary).toLocaleString()}/year</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{row.notes}</p>
        </div>
      </div>
    ),
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setData(initialData);
      setLoading(false);
      toast.success("Data refreshed");
    }, 1500);
  };

  const handleCellEdit = (row: Employee, columnKey: string, newValue: unknown) => {
    setData(prev => prev.map(r => r.id === row.id ? { ...r, [columnKey]: newValue } : r));
    toast.success(`Updated ${columnKey} for ${row.name}`);
  };

  return (
    <>
      <PageMeta title="Advanced Table | TailAdmin" description="Full-featured data table" />
      <PageBreadCrumb pageTitle="Advanced Table" />

      <div className="space-y-6">
        {/* Demo Controls */}
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleRefresh} className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors">
            Simulate Loading
          </button>
          <button onClick={() => setData([])} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors dark:bg-white/[0.05] dark:text-gray-300">
            Clear Data
          </button>
          <button onClick={() => setData(initialData)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors dark:bg-white/[0.05] dark:text-gray-300">
            Reset Data
          </button>
        </div>

        {/* Advanced Table with ALL features */}
        <AdvancedTable<Employee>
          data={data}
          columns={columns}
          title="Employee Directory"
          description="Full demo with all 20+ features enabled"
          rowKey="id"
          
          // ALL feature toggles
          enableSearch={true}
          enablePagination={true}
          enableExport={true}
          enableSelection={true}
          enableColumnVisibility={true}
          enableStickyHeader={true}
          enableRowExpansion={true}
          enableColumnResize={true}
          enableColumnReorder={true}
          enableInlineEdit={true}
          enableKeyboardNavigation={true}
          enableSavedViews={true}
          enableGrouping={true}
          enableAggregation={true}
          enablePinnedColumns={true}
          enableExcelExport={true}
          enablePdfExport={true}
          
          // Configuration
          pageSize={5}
          maxHeight="500px"
          viewStorageKey="employee-table"
          
          // Actions
          rowActions={rowActions}
          bulkActions={bulkActions}
          expandedRowContent={expandedRowContent}
          
          // States
          loading={loading}
          emptyTitle="No employees found"
          emptyDescription="Add your first team member."
          
          // Callbacks
          onCellEdit={handleCellEdit}
        />

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <FeatureCard title="⌨️ Keyboard Nav" description="Arrow keys + Enter/Space" />
          <FeatureCard title="💾 Saved Views" description="Save/restore column config" />
          <FeatureCard title="🗂️ Row Grouping" description="Group by any column" />
          <FeatureCard title="📊 Aggregation" description="Sum/Avg/Count in footer" />
          <FeatureCard title="📌 Pinned Columns" description="Pin to left/right" />
          <FeatureCard title="📄 Excel Export" description="Download as XLSX" />
          <FeatureCard title="📑 PDF Export" description="Download as PDF" />
          <FeatureCard title="🔍 Search" description="Filter all columns" />
          <FeatureCard title="↕️ Sort" description="Multi-column sorting" />
          <FeatureCard title="📏 Resize" description="Drag column borders" />
          <FeatureCard title="🔀 Reorder" description="Drag to reorder" />
          <FeatureCard title="✏️ Inline Edit" description="Double-click to edit" />
        </div>
      </div>
    </>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <h4 className="font-medium text-gray-800 dark:text-white/90 mb-1">{title}</h4>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}
