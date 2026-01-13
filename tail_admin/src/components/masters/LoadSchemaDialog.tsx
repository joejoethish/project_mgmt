import { useState, useEffect } from 'react';
import { MasterSchema } from '../../hooks/useMasterSchema';
import { formatDistanceToNow } from 'date-fns';

interface LoadSchemaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (schema: MasterSchema) => void;
  onDelete?: (schemaId: number) => void;
  schemas: MasterSchema[];
  isLoading?: boolean;
}

export default function LoadSchemaDialog({
  isOpen,
  onClose,
  onLoad,
  onDelete,
  schemas,
  isLoading = false,
}: LoadSchemaDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchema, setSelectedSchema] = useState<MasterSchema | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedSchema(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSchemas = schemas.filter(schema =>
    schema.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    schema.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLoad = () => {
    if (selectedSchema) {
      onLoad(selectedSchema);
      onClose();
    }
  };

  const handleDelete = (schema: MasterSchema, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete schema "${schema.name}"? This cannot be undone.`)) {
      onDelete?.(schema.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            📂 Load Schema
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schemas..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            autoFocus
          />
        </div>

        {/* Schema List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading schemas...
            </div>
          ) : filteredSchemas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No schemas found matching your search' : 'No schemas available'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSchemas.map((schema) => (
                <div
                  key={schema.id}
                  onClick={() => setSelectedSchema(schema)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md
                    ${selectedSchema?.id === schema.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {schema.name}
                        </h3>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                          v{schema.version}
                        </span>
                      </div>
                      
                      {schema.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {schema.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>📊 {schema.master_count} masters</span>
                        <span>🔗 {schema.relationship_count} relationships</span>
                        <span>📅 {formatDistanceToNow(new Date(schema.updated_at))} ago</span>
                        {schema.created_by && (
                          <span>👤 {schema.created_by.username}</span>
                        )}
                      </div>
                    </div>

                    {onDelete && (
                      <button
                        onClick={(e) => handleDelete(schema, e)}
                        className="ml-2 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete schema"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleLoad}
            disabled={!selectedSchema}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📂 Load Selected
          </button>
        </div>
      </div>
    </div>
  );
}

