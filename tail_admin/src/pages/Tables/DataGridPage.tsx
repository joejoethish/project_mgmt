import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { DataGrid } from "../../components/ui/DataGrid";

const dummyData = [
  { id: 1, name: "John Doe", role: "Admin", status: "Active", email: "john@example.com", date: "2023-01-01" },
  { id: 2, name: "Jane Smith", role: "Editor", status: "Inactive", email: "jane@example.com", date: "2023-01-05" },
  { id: 3, name: "Bob Johnson", role: "User", status: "Active", email: "bob@example.com", date: "2023-02-10" },
  { id: 4, name: "Alice Brown", role: "User", status: "Pending", email: "alice@example.com", date: "2023-03-15" },
  { id: 5, name: "Charlie Wilson", role: "Editor", status: "Active", email: "charlie@example.com", date: "2023-04-20" },
  { id: 6, name: "Eva Davis", role: "Admin", status: "Active", email: "eva@example.com", date: "2023-05-25" },
  { id: 7, name: "Frank Miller", role: "User", status: "Inactive", email: "frank@example.com", date: "2023-06-30" },
  { id: 8, name: "Grace Lee", role: "User", status: "Active", email: "grace@example.com", date: "2023-07-05" },
  { id: 9, name: "Henry Taylor", role: "Editor", status: "Pending", email: "henry@example.com", date: "2023-07-10" },
  { id: 10, name: "Ivy Clark", role: "User", status: "Active", email: "ivy@example.com", date: "2023-08-15" },
];

export default function DataGridPage() {
  return (
    <>
      <PageMeta
        title="Data Grid | TailAdmin"
        description="Advanced Data Grid with filtering, sorting, and pagination."
      />
      <PageBreadcrumb pageTitle="Data Grid" />
      <div className="space-y-6">
        <DataGrid 
            title="Employee Directory"
            description="Manage your team members and their roles."
            rowData={dummyData}
            columns={['name', 'role', 'status', 'email', 'date']}
            pagination={true}
        />
      </div>
    </>
  );
}
