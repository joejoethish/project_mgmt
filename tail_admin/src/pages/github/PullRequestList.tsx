import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AdvancedTable, AdvancedTableColumn } from '../../components/tables/AdvancedTable';

const API_BASE = 'http://192.168.1.26:8000/api/github';

interface PullRequest {
  pr_id: string;
  repository_name: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author_login: string;
  created_at: string;
  merged_at: string | null;
  html_url: string;
}

const PullRequestList = () => {
  const { data: prs, isLoading, error } = useQuery<PullRequest[]>({
    queryKey: ['github-prs'],
    queryFn: async () => (await axios.get(`${API_BASE}/prs/`)).data
  });

  const columns: AdvancedTableColumn<PullRequest>[] = [
    {
      key: 'number',
      header: '#',
      sortable: true,
      render: (value, row) => (
        <a href={row.html_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-mono">
          #{value}
        </a>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (value, row) => (
        <div className="max-w-md">
          <a href={row.html_url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-800 dark:text-gray-200 hover:text-indigo-600 transition">
            {value}
          </a>
        </div>
      ),
    },
    {
      key: 'repository_name',
      header: 'Repository',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-500 font-mono">{value}</span>
      ),
    },
    {
      key: 'state',
      header: 'Status',
      sortable: true,
      render: (value) => {
        const stateConfig = {
          open: { bg: 'bg-green-100', text: 'text-green-700', label: 'Open' },
          closed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Closed' },
          merged: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Merged' },
        };
        const config = stateConfig[value as keyof typeof stateConfig] || stateConfig.open;
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'author_login',
      header: 'Author',
      sortable: true,
      render: (value) => (
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
            {(value as string)?.charAt(0).toUpperCase()}
          </span>
          {value}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (value) => (
        <span className="text-gray-500 text-sm">
          {new Date(value as string).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'merged_at',
      header: 'Merged',
      sortable: true,
      render: (value) => value ? (
        <span className="text-green-600 text-sm">
          {new Date(value as string).toLocaleDateString()}
        </span>
      ) : (
        <span className="text-gray-400">-</span>
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
        Failed to load pull requests
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <AdvancedTable<PullRequest>
        data={prs || []}
        columns={columns}
        title="Pull Requests"
        description="Track and review pull requests across all repositories"
        rowKey="pr_id"
        
        enableSearch={true}
        enablePagination={true}
        enableExport={true}
        enableExcelExport={true}
        enableColumnVisibility={true}
        enableStickyHeader={true}
        enableColumnResize={true}
        
        pageSize={25}
        onRowClick={(row) => window.open(row.html_url, '_blank')}
      />
    </div>
  );
};

export default PullRequestList;
