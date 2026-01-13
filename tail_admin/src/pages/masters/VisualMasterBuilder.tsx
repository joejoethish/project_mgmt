import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import toast, { Toaster } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import AddFieldModal, { FieldFormData } from '../../components/masters/AddFieldModal';
import NewMasterDialog, { MasterFormData } from '../../components/masters/NewMasterDialog';
import RelationshipDialog, { RelationshipData } from '../../components/masters/RelationshipDialog';
import SaveSchemaDialog from '../../components/masters/SaveSchemaDialog';
import LoadSchemaDialog from '../../components/masters/LoadSchemaDialog';
import ExportDialog from '../../components/masters/ExportDialog';
import ImportJSONDialog from '../../components/masters/ImportJSONDialog';
import { useMasterSchema } from '../../hooks/useMasterSchema';

// Type definitions for node data
interface MasterNodeData {
  label: string;
  icon?: string;
  description?: string;
  searchable?: boolean;
  exportable?: boolean;
  soft_delete?: boolean;
  fields: FieldFormData[];
  onFieldClick?: (field: FieldFormData, node: { id: string; data: MasterNodeData }) => void;
  onAddField?: (masterId: string) => void;
  [key: string]: unknown;
}

// Custom node component with connection handles
const MasterNode = ({ data, id }: { data: any; id: string }) => {
  const handleFieldClick = (field: any, event: React.MouseEvent) => {
    event.stopPropagation();
    if (data.onFieldClick) {
      data.onFieldClick(field, { id, data });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-blue-500 min-w-[250px]">
      <div className="bg-blue-500 text-white px-4 py-2 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-xl">{data.icon || '📋'}</span>
          <h3 className="font-semibold">{data.label}</h3>
        </div>
      </div>

      <div className="p-3 space-y-1">
        {data.fields?.map((field: any, index: number) => (
          <div
            key={index}
            onClick={(e) => handleFieldClick(field, e)}
            className="relative flex items-center gap-2 text-sm py-1 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer transition-colors"
          >
            {/* Left Handle - Target */}
            <Handle
              type="target"
              position={Position.Left}
              id={`${field.name}-target`}
              className="!w-3 !h-3 !border-2 !border-white"
              style={{
                left: -8,
                background: field.isPrimary ? '#fbbf24' : '#3b82f6',
              }}
            />

            <span className="text-lg">
              {field.isPrimary ? '⚡' : field.isForeign ? '🔗' : '📝'}
            </span>
            <span className="flex-1 font-medium text-gray-800 dark:text-white">
              {field.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {field.type}
            </span>
            {field.required && <span className="text-red-500">*</span>}
            {field.unique && <span className="text-blue-500">🔒</span>}

            {/* Right Handle - Source */}
            <Handle
              type="source"
              position={Position.Right}
              id={`${field.name}-source`}
              className="!w-3 !h-3 !border-2 !border-white"
              style={{
                right: -8,
                background: field.isForeign ? '#10b981' : '#6b7280',
              }}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (data.onAddField) {
              data.onAddField(id);
            }
          }}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
        >
          + Add Field
        </button>
      </div>
    </div>
  );
};

const nodeTypes = {
  masterNode: MasterNode,
};

export default function VisualMasterBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [selectedFieldParent, setSelectedFieldParent] = useState<any>(null);

  // Field Modal state
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [targetMasterId, setTargetMasterId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<FieldFormData | null>(null);

  // Master Dialog state
  const [isNewMasterDialogOpen, setIsNewMasterDialogOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState<MasterFormData | null>(null);

  // Relationship Dialog state
  const [isRelationshipDialogOpen, setIsRelationshipDialogOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

  // Schema management
  const {
    schemas,
    currentSchema,
    loading: schemaLoading,
    loadSchemas,
    saveSchema,
    deleteSchema,
  } = useMasterSchema();

  // Schema dialog state
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [schemaName, setSchemaName] = useState('');
  const [schemaDescription, setSchemaDescription] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load available schemas on mount
  useEffect(() => {
    loadSchemas().catch(err => {
      console.error('Failed to load schemas:', err);
    });
  }, [loadSchemas]);

  // Track unsaved changes
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges]);

  // Handle save
  const handleSave = async (name: string, description: string) => {
    try {
      await saveSchema(name, nodes, edges, description, currentSchema?.id);
      setSchemaName(name);
      setSchemaDescription(description);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setIsSaveDialogOpen(false);
      toast.success('Schema saved successfully!');
    } catch (error) {
      toast.error('Failed to save schema');
      console.error(error);
    }
  };

  // Handle load
  const handleLoad = async (schema: any) => {
    try {
      setNodes(schema.schema_data.nodes);
      setEdges(schema.schema_data.edges);
      setSchemaName(schema.name);
      setSchemaDescription(schema.description || '');
      setLastSaved(new Date(schema.updated_at));
      setHasUnsavedChanges(false);
      setIsLoadDialogOpen(false);
      toast.success(`Loaded "${schema.name}"`);
    } catch (error) {
      toast.error('Failed to load schema');
      console.error(error);
    }
  };

  // Handle delete
  const handleDeleteSchema = async (schemaId: number) => {
    try {
      await deleteSchema(schemaId);
      toast.success('Schema deleted');
    } catch (error) {
      toast.error('Failed to delete schema');
      console.error(error);
    }
  };

  // Handle import from JSON
  const handleImport = useCallback((importedNodes: Node[], importedEdges: Edge[], mergeMode: boolean) => {
    if (mergeMode) {
      // Merge with existing
      setNodes((nds) => [...nds, ...importedNodes]);
      setEdges((eds) => [...eds, ...importedEdges]);
      toast.success(`Imported ${importedNodes.length} masters (merged)`);
    } else {
      // Replace all
      setNodes(importedNodes);
      setEdges(importedEdges);
      toast.success(`Imported ${importedNodes.length} masters (replaced canvas)`);
    }

    setHasUnsavedChanges(true);
    setIsImportDialogOpen(false);
  }, [setNodes, setEdges]);

  // Handle field click
  const handleFieldClick = useCallback((field: any, parentNode: any) => {
    setSelectedField(field);
    setSelectedFieldParent(parentNode);
    setSelectedElement(null);
  }, []);

  // Handle add field
  const handleAddField = useCallback((masterId: string) => {
    setTargetMasterId(masterId);
    setEditingField(null);
    setIsAddFieldModalOpen(true);
  }, []);

  // Add field to master
  const addFieldToMaster = useCallback((field: FieldFormData) => {
    if (!targetMasterId) return;

    setNodes((nds) =>
      nds.map((node) =>
        node.id === targetMasterId
          ? {
            ...node,
            data: {
              ...node.data,
              fields: [...((node.data as MasterNodeData).fields || []), field],
            },
          }
          : node
      )
    );
    setIsAddFieldModalOpen(false);
    setEditingField(null);
    setTargetMasterId(null);
  }, [targetMasterId, setNodes]);

  // Update field
  const updateFieldInMaster = useCallback((field: FieldFormData) => {
    if (!selectedFieldParent || !selectedField) return;

    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedFieldParent.id
          ? {
            ...node,
            data: {
              ...node.data,
              fields: ((node.data as MasterNodeData).fields || []).map((f: FieldFormData) =>
                f.name === selectedField.name ? field : f
              ),
            },
          }
          : node
      )
    );
    setSelectedField(field);
    setIsAddFieldModalOpen(false);
    setEditingField(null);
  }, [selectedFieldParent, selectedField, setNodes]);

  // Delete field
  const deleteFieldFromMaster = useCallback(() => {
    if (!selectedFieldParent || !selectedField) return;

    if (selectedField.isPrimary) {
      alert('Cannot delete primary key field');
      return;
    }

    if (confirm(`Delete field "${selectedField.name}"?`)) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedFieldParent.id
            ? {
              ...node,
              data: {
                ...node.data,
                fields: ((node.data as MasterNodeData).fields || []).filter((f: FieldFormData) => f.name !== selectedField.name),
              },
            }
            : node
        )
      );
      setSelectedField(null);
      setSelectedFieldParent(null);
    }
  }, [selectedFieldParent, selectedField, setNodes]);

  // Create new master
  const createNewMaster = useCallback((masterData: MasterFormData) => {
    const newNode: Node = {
      id: masterData.name,
      type: 'masterNode',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label: masterData.display_name,
        icon: masterData.icon,
        description: masterData.description,
        searchable: masterData.searchable,
        exportable: masterData.exportable,
        soft_delete: masterData.soft_delete,
        onFieldClick: handleFieldClick,
        onAddField: handleAddField,
        fields: [
          { name: 'id', label: 'ID', type: 'uuid', isPrimary: true, required: true, unique: true },
        ],
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsNewMasterDialogOpen(false);
    setEditingMaster(null);
  }, [handleFieldClick, handleAddField, setNodes]);

  // Update master settings
  const updateMasterSettings = useCallback((masterData: MasterFormData) => {
    if (!selectedElement) return;

    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedElement.id
          ? {
            ...node,
            data: {
              ...node.data,
              label: masterData.display_name,
              icon: masterData.icon,
              description: masterData.description,
              searchable: masterData.searchable,
              exportable: masterData.exportable,
              soft_delete: masterData.soft_delete,
            },
          }
          : node
      )
    );

    setSelectedElement((prev: any) => ({
      ...prev,
      data: {
        ...prev.data,
        label: masterData.display_name,
        icon: masterData.icon,
      },
    }));
    setIsNewMasterDialogOpen(false);
    setEditingMaster(null);
  }, [selectedElement, setNodes]);

  // Delete master
  const deleteMaster = useCallback(() => {
    if (!selectedElement) return;

    if (confirm(`Delete master "${selectedElement.data?.label}"? This cannot be undone.`)) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedElement.id));
      setEdges((eds) => eds.filter((edge) =>
        edge.source !== selectedElement.id && edge.target !== selectedElement.id
      ));
      setSelectedElement(null);
    }
  }, [selectedElement, setNodes, setEdges]);

  // Duplicate master
  const duplicateMaster = useCallback(() => {
    if (!selectedElement) return;

    const newNode: Node = {
      id: `${selectedElement.id}_copy_${Date.now()}`,
      type: 'masterNode',
      position: {
        x: selectedElement.position.x + 50,
        y: selectedElement.position.y + 50,
      },
      data: {
        ...selectedElement.data,
        label: `${selectedElement.data.label} (Copy)`,
        onFieldClick: handleFieldClick,
        onAddField: handleAddField,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [selectedElement, handleFieldClick, handleAddField, setNodes]);

  // Handle connection - open relationship dialog
  const onConnect = useCallback((connection: Connection) => {
    setPendingConnection(connection);
    setIsRelationshipDialogOpen(true);
  }, []);

  // Save relationship
  const saveRelationship = useCallback((relationshipData: RelationshipData) => {
    if (!pendingConnection) return;

    const sourceNode = nodes.find(n => n.id === pendingConnection.source);
    const targetNode = nodes.find(n => n.id === pendingConnection.target);

    if (!sourceNode || !targetNode) return;

    const newEdge: Edge = {
      id: `e${Date.now()}`,
      source: pendingConnection.source,
      target: pendingConnection.target,
      sourceHandle: pendingConnection.sourceHandle,
      targetHandle: pendingConnection.targetHandle,
      type: 'smoothstep',
      animated: true,
      label: `${relationshipData.type}`,
      data: relationshipData as unknown as Record<string, unknown>,
    };

    setEdges((eds) => addEdge(newEdge, eds));
    setIsRelationshipDialogOpen(false);
    setPendingConnection(null);
  }, [pendingConnection, nodes, setEdges]);

  // Load sample data
  const loadSampleData = () => {
    const sampleNodes: Node[] = [
      {
        id: 'departments',
        type: 'masterNode',
        position: { x: 100, y: 100 },
        data: {
          label: 'Departments',
          icon: '🏢',
          searchable: true,
          exportable: true,
          soft_delete: false,
          onFieldClick: handleFieldClick,
          onAddField: handleAddField,
          fields: [
            { name: 'id', label: 'ID', type: 'uuid', isPrimary: true, required: true, unique: true },
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'code', label: 'Code', type: 'text', required: true, unique: true },
            { name: 'head_name', label: 'Head Name', type: 'text' },
          ],
        },
      },
      {
        id: 'employees',
        type: 'masterNode',
        position: { x: 500, y: 100 },
        data: {
          label: 'Employees',
          icon: '👥',
          searchable: true,
          exportable: true,
          soft_delete: true,
          onFieldClick: handleFieldClick,
          onAddField: handleAddField,
          fields: [
            { name: 'id', label: 'ID', type: 'uuid', isPrimary: true, required: true, unique: true },
            { name: 'first_name', label: 'First Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true, unique: true },
            { name: 'dept_id', label: 'Department ID', type: 'uuid', isForeign: true, required: true },
          ],
        },
      },
    ];

    const sampleEdges: Edge[] = [
      {
        id: 'e1',
        source: 'employees',
        target: 'departments',
        sourceHandle: 'dept_id-source',
        targetHandle: 'id-target',
        type: 'smoothstep',
        animated: true,
        label: '1-to-many',
      },
    ];

    setNodes(sampleNodes);
    setEdges(sampleEdges);
  };

  // Parse connection handles
  const getConnectionInfo = () => {
    if (!pendingConnection) return null;

    const sourceNode = nodes.find(n => n.id === pendingConnection.source);
    const targetNode = nodes.find(n => n.id === pendingConnection.target);

    if (!sourceNode || !targetNode) return null;

    const sourceHandle = pendingConnection.sourceHandle?.replace('-source', '').replace('-target', '');
    const targetHandle = pendingConnection.targetHandle?.replace('-source', '').replace('-target', '');

    return {
      sourceNodeId: sourceNode.id,
      sourceNodeLabel: sourceNode.data.label,
      targetNodeId: targetNode.id,
      targetNodeLabel: targetNode.data.label,
      sourceHandle,
      targetHandle,
    };
  };

  return (
    <>
      <PageBreadcrumb pageTitle="Visual Master Builder" />

      {/* Header Bar with Save/Load */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={schemaName}
            onChange={(e) => setSchemaName(e.target.value)}
            placeholder="Unnamed Schema"
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[200px]"
          />
          {hasUnsavedChanges && (
            <span className="text-orange-500 font-semibold" title="Unsaved changes">
              *
            </span>
          )}
          {lastSaved && !hasUnsavedChanges && (
            <span className="text-xs text-gray-500">
              Saved {formatDistanceToNow(lastSaved)} ago
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLoadDialogOpen(true)}
            className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
          >
            📂 Load
          </button>
          <button
            onClick={() => setIsImportDialogOpen(true)}
            className="px-4 py-1.5 text-sm border border-purple-600 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 font-medium"
          >
            📥 Import
          </button>
          <button
            onClick={() => setIsExportDialogOpen(true)}
            className="px-4 py-1.5 text-sm border border-green-600 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 font-medium"
            disabled={nodes.length === 0}
          >
            📤 Export
          </button>
          <button
            onClick={() => setIsSaveDialogOpen(true)}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            disabled={schemaLoading}
          >
            {schemaLoading ? '⏳ Saving...' : '💾 Save'}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-240px)] gap-4">
        {/* Left Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
            Masters Library
          </h3>

          <div className="space-y-2 mb-6">
            <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Quick Actions</div>
            <button
              onClick={() => {
                setEditingMaster(null);
                setIsNewMasterDialogOpen(true);
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              ✨ New Master
            </button>
            <button
              onClick={loadSampleData}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              📊 Load Sample
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-semibold mb-1">💡 Tips:</p>
            <ul className="space-y-1 text-xs">
              <li>• Drag from field handles to create relationships</li>
              <li>• Click fields to see details</li>
              <li>• Click masters to edit settings</li>
            </ul>
          </div>
        </div>

        {/* Center Canvas */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              onNodeClick={(_, node) => {
                setSelectedElement(node);
                setSelectedField(null);
                setSelectedFieldParent(null);
              }}
              onEdgeClick={(_, edge) => {
                setSelectedElement(edge);
                setSelectedField(null);
                setSelectedFieldParent(null);
              }}
            >
              <Controls />
              <MiniMap />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Properties</h3>

            {selectedField && selectedFieldParent ? (
              /* Field Properties */
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedFieldParent.data?.icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{selectedFieldParent.data?.label}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{selectedFieldParent.data?.fields?.length} fields</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-2xl">{selectedField.isPrimary ? '⚡' : selectedField.isForeign ? '🔗' : '📝'}</span>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white">{selectedField.name}</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700/50 font-mono">
                    {selectedField.type}
                  </div>
                </div>

                {selectedField.isPrimary && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                      <span>⚡</span> Primary Key
                    </h4>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">Unique identifier</p>
                  </div>
                )}

                {selectedField.isForeign && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                      <span>🔗</span> Foreign Key
                    </h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400">References another master</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedField(null);
                        setSelectedFieldParent(null);
                      }}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => {
                        setSelectedElement(selectedFieldParent);
                        setSelectedField(null);
                        setSelectedFieldParent(null);
                      }}
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      View Table
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingField(selectedField);
                        setTargetMasterId(selectedFieldParent.id);
                        setIsAddFieldModalOpen(true);
                      }}
                      className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={deleteFieldFromMaster}
                      className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedElement?.type === 'masterNode' ? (
              /* Master Properties */
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-3xl">{selectedElement.data?.icon}</span>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedElement.data?.label}</h4>
                    <p className="text-xs text-gray-500">Master Table</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Settings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedElement.data?.searchable ?? true} readOnly />
                      <span>Searchable</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedElement.data?.exportable ?? true} readOnly />
                      <span>Exportable</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedElement.data?.soft_delete ?? false} readOnly />
                      <span>Soft Delete</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Statistics</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div>Fields: {selectedElement.data?.fields?.length || 0}</div>
                    <div>Relationships: {edges.filter(e => e.source === selectedElement.id || e.target === selectedElement.id).length}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <button
                    onClick={() => {
                      setEditingMaster({
                        name: selectedElement.id,
                        display_name: selectedElement.data?.label || '',
                        icon: selectedElement.data?.icon || '📋',
                        description: selectedElement.data?.description || '',
                        searchable: selectedElement.data?.searchable ?? true,
                        exportable: selectedElement.data?.exportable ?? true,
                        soft_delete: selectedElement.data?.soft_delete ?? false,
                      });
                      setIsNewMasterDialogOpen(true);
                    }}
                    className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    ✏️ Edit Master
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={duplicateMaster}
                      className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      📋 Duplicate
                    </button>
                    <button
                      onClick={deleteMaster}
                      className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* No Selection */
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p className="text-sm mb-2">Select a master or field</p>
                <p className="text-xs">💡 Click on nodes to view properties</p>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <AddFieldModal
          isOpen={isAddFieldModalOpen}
          onClose={() => {
            setIsAddFieldModalOpen(false);
            setEditingField(null);
            setTargetMasterId(null);
          }}
          onSave={(field) => {
            if (editingField) {
              updateFieldInMaster(field);
            } else {
              addFieldToMaster(field);
            }
          }}
          existingFields={targetMasterId ? ((nodes.find(n => n.id === targetMasterId)?.data as MasterNodeData)?.fields || []) : []}
          editMode={!!editingField}
          initialData={editingField || undefined}
        />

        <NewMasterDialog
          isOpen={isNewMasterDialogOpen}
          onClose={() => {
            setIsNewMasterDialogOpen(false);
            setEditingMaster(null);
          }}
          onSave={(masterData) => {
            if (editingMaster) {
              updateMasterSettings(masterData);
            } else {
              createNewMaster(masterData);
            }
          }}
          editMode={!!editingMaster}
          initialData={editingMaster || undefined}
          existingMasters={nodes.map(n => n.id)}
        />

        <RelationshipDialog
          isOpen={isRelationshipDialogOpen}
          onClose={() => {
            setIsRelationshipDialogOpen(false);
            setPendingConnection(null);
          }}
          onSave={saveRelationship}
          initialData={getConnectionInfo() as { sourceNodeId: string; sourceNodeLabel: string; targetNodeId: string; targetNodeLabel: string; sourceHandle?: string; targetHandle?: string; } | undefined}
          availableTargets={nodes.map(n => {
            const data = n.data as MasterNodeData;
            return {
              id: n.id,
              label: data.label || '',
              fields: data.fields || [],
            };
          })}
        />

        <SaveSchemaDialog
          isOpen={isSaveDialogOpen}
          onClose={() => setIsSaveDialogOpen(false)}
          onSave={handleSave}
          currentName={schemaName}
          currentDescription={schemaDescription}
          isSaving={schemaLoading}
        />

        <LoadSchemaDialog
          isOpen={isLoadDialogOpen}
          onClose={() => setIsLoadDialogOpen(false)}
          onLoad={handleLoad}
          onDelete={handleDeleteSchema}
          schemas={schemas}
          isLoading={schemaLoading}
        />

        <ExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          nodes={nodes}
          edges={edges}
          schemaName={schemaName || 'schema'}
        />

        <ImportJSONDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onImport={handleImport}
          existingNodes={nodes}
          handleFieldClick={handleFieldClick}
          handleAddField={handleAddField}
        />

        <Toaster position="top-right" />
      </>
      );
}


