import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AdvancedTable, AdvancedTableColumn } from '../../components/tables/AdvancedTable';

const API_BASE = 'http://192.168.1.26:8000/api/github';

interface Commit {
  commit_id: string;
  repository_name: string; // Flattened in serializer? Check backend.
  sha: string;
  author_name: string;
  author_login: string | null;
  message: string;
  html_url: string;
  committed_at: string;
  additions: number;
  deletions: number;
  [key: string]: unknown;
}

const CommitList = () => {
  const { data: commits, isLoading, error } = useQuery<Commit[]>({
    queryKey: ['github-commits'],
    queryFn: async () => (await axios.get(`${API_BASE}/commits/`)).data
  });

  const columns: AdvancedTableColumn<Commit>[] = [
    {
      key: 'message',
      header: 'Message',
      sortable: true,
      render: (value, row) => (
        <div className="max-w-lg">
          <a 
            href={row.html_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 transition block truncate"
            title={value as string}
          >
            {(value as string).split('\n')[0]}
          </a>
        </div>
      ),
    },
    {
      key: 'repository_name',
      header: 'Repository',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-500 font-mono">{value as string}</span>
      ),
    },
    {
      key: 'author_name',
      header: 'Author',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {row.author_login ? (
             <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
               {row.author_login.charAt(0).toUpperCase()}
             </span>
          ) : (
             <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
               {(value as string).charAt(0).toUpperCase()}
             </span>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium">{value as string}</span>
            {row.author_login && <span className="text-xs text-gray-400">@{row.author_login}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'committed_at',
      header: 'Date',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {new Date(value as string).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'stats',
      header: 'Stats',
      render: (_value, row) => (
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-green-600">+{row.additions}</span>
          <span className="text-red-600">-{row.deletions}</span>
        </div>
      ),
    },
    {
      key: 'sha',
      header: 'SHA',
      render: (value) => (
        <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600">
          {(value as string).substring(0, 7)}
        </span>
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
        Failed to load commits
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <AdvancedTable<Commit>
        data={commits || []}
        columns={columns}
        title="Commits"
        description="View latest code changes across all tracked repositories"
        rowKey="commit_id"
        
        enableSearch={true}
        enablePagination={true}
        enableExport={true}
        enableColumnVisibility={true}
        enableStickyHeader={true}
        
        pageSize={50}
        onRowClick={(row) => window.open(row.html_url, '_blank')}
      />
    </div>
  );
};

export default CommitList;
