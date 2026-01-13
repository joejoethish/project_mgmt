import { useCallback, useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';

const API_BASE = 'http://192.168.1.26:8000/api/reporting';

interface SchemaField {
  name: string;
  verbose_name: string;
  type: string;
}

interface Relation {
  name: string;
  verbose_name: string;
  related_model: string;
}

interface ModelSchema {
  model: string;
  fields: SchemaField[];
  relations: Relation[];
}

interface ModelInfo {
  full_key: string;
  verbose_name: string;
}

interface TableNodeData {
  modelKey: string;
  label: string;
  fields: SchemaField[];
  relations: Relation[];
  selectedFields: string[];
  onFieldToggle: (modelKey: string, fieldPath: string) => void;
  isPrimary: boolean;
  [key: string]: unknown;
}

// Custom Table Node with checkboxes
const TableNode = ({ data, id }: { data: TableNodeData; id: string }) => {
  return (
    <div className={`rounded-lg shadow-lg border-2 min-w-[220px] ${data.isPrimary ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-400 bg-white dark:bg-gray-800'}`}>
      {/* Header */}
      <div className={`px-3 py-2 rounded-t-lg ${data.isPrimary ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="font-semibold text-sm">{data.label}</span>
          {data.isPrimary && <span className="text-xs bg-white/20 px-1 rounded">PRIMARY</span>}
        </div>
      </div>
      
      {/* Fields with checkboxes */}
      <div className="p-2 max-h-48 overflow-y-auto">
        {data.fields?.map((field, idx) => {
          const fieldPath = data.isPrimary ? field.name : `${data.modelKey.split('.')[1]?.toLowerCase() || id}__${field.name}`;
          const isSelected = data.selectedFields.includes(fieldPath);
          
          return (
            <div key={idx} className="relative flex items-center gap-2 text-xs py-1 px-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <Handle
                type="target"
                position={Position.Left}
                id={`${field.name}-target`}
                className="!w-2 !h-2"
                style={{ left: -6, background: '#6b7280' }}
              />
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => data.onFieldToggle(data.modelKey, fieldPath)}
                className="w-3 h-3"
                onClick={(e) => e.stopPropagation()}
              />
              <span className={`flex-1 ${isSelected ? 'font-medium text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                {field.verbose_name}
              </span>
              <span className="text-gray-400 text-[10px]">{field.type}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={`${field.name}-source`}
                className="!w-2 !h-2"
                style={{ right: -6, background: '#3b82f6' }}
              />
            </div>
          );
        })}
      </div>
      
      {/* Relation indicators */}
      {data.relations && data.relations.length > 0 && (
        <div className="px-2 pb-2 pt-1 border-t border-gray-200 dark:border-gray-600">
          <p className="text-[10px] text-gray-400 mb-1">Relations:</p>
          {data.relations.slice(0, 3).map((rel, idx) => (
            <div key={idx} className="text-[10px] text-blue-500 truncate">🔗 {rel.verbose_name}</div>
          ))}
        </div>
      )}
    </div>
  );
};

const nodeTypes = { tableNode: TableNode };

interface DatasetERDViewProps {
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
}

export default function DatasetERDView({ selectedFields, onFieldsChange }: DatasetERDViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [schemas, setSchemas] = useState<Record<string, ModelSchema>>({});
  const [loadedModels, setLoadedModels] = useState<string[]>([]);

  // Load all models on mount
  useEffect(() => {
    axios.get(`${API_BASE}/schema/`).then(res => setModels(res.data));
  }, []);

  // Handle field toggle
  const handleFieldToggle = useCallback((modelKey: string, fieldPath: string) => {
    const newFields = selectedFields.includes(fieldPath)
      ? selectedFields.filter(f => f !== fieldPath)
      : [...selectedFields, fieldPath];
    onFieldsChange(newFields);
  }, [selectedFields, onFieldsChange]);

  // Add model to canvas
  const addModelToCanvas = async (modelKey: string) => {
    if (loadedModels.includes(modelKey)) return;
    
    try {
      const res = await axios.get(`${API_BASE}/schema/?model=${modelKey}`);
      const schema: ModelSchema = res.data;
      
      // Compute isPrimary BEFORE updating state
      const isPrimary = loadedModels.length === 0;
      const modelName = models.find(m => m.full_key === modelKey)?.verbose_name || modelKey;
      
      // Create a snapshot of what will be loaded after this addition
      const modelsAfterAdd = [...loadedModels, modelKey];
      const schemasAfterAdd = { ...schemas, [modelKey]: schema };
      
      // Create node
      const newNode: Node = {
        id: modelKey,
        type: 'tableNode',
        position: { x: loadedModels.length * 300 + 50, y: 100 + (loadedModels.length % 2) * 200 },
        data: {
          modelKey,
          label: modelName,
          fields: schema.fields,
          relations: schema.relations,
          selectedFields,
          onFieldToggle: handleFieldToggle,
          isPrimary,
        },
      };
      
      // Create edges for FK relationships - check against existing loaded models
      const newEdges: Edge[] = [];
      
      // Check if this new model has FKs to already loaded models
      schema.relations.forEach(rel => {
        if (loadedModels.includes(rel.related_model)) {
          newEdges.push({
            id: `${modelKey}-${rel.related_model}-${rel.name}`,
            source: modelKey,
            target: rel.related_model,
            type: 'smoothstep',
            animated: true,
            label: rel.verbose_name,
            style: { stroke: '#3b82f6' },
          });
        }
      });
      
      // Check if any already loaded model has FK to this new model
      loadedModels.forEach(existingModel => {
        const existingSchema = schemas[existingModel];
        if (existingSchema) {
          existingSchema.relations.forEach(rel => {
            if (rel.related_model === modelKey) {
              const edgeId = `${existingModel}-${modelKey}-${rel.name}`;
              if (!newEdges.find(e => e.id === edgeId)) {
                newEdges.push({
                  id: edgeId,
                  source: existingModel,
                  target: modelKey,
                  type: 'smoothstep',
                  animated: true,
                  label: rel.verbose_name,
                  style: { stroke: '#3b82f6' },
                });
              }
            }
          });
        }
      });
      
      // Batch all state updates together
      setSchemas(schemasAfterAdd);
      setLoadedModels(modelsAfterAdd);
      setNodes(prev => [...prev, newNode]);
      setEdges(prev => [...prev, ...newEdges]);
      
    } catch (err) {
      console.error('Failed to load model schema:', err);
    }
  };

  // Update nodes when selectedFields changes
  useEffect(() => {
    setNodes(nds => nds.map(node => ({
      ...node,
      data: { ...node.data, selectedFields, onFieldToggle: handleFieldToggle },
    })));
  }, [selectedFields, handleFieldToggle]);

  // Remove model from canvas
  const removeModelFromCanvas = (modelKey: string) => {
    setNodes(prev => prev.filter(n => n.id !== modelKey));
    setEdges(prev => prev.filter(e => e.source !== modelKey && e.target !== modelKey));
    setLoadedModels(prev => prev.filter(m => m !== modelKey));
  };

  // Select all fields in canvas
  const selectAllFields = () => {
    const allFields: string[] = [];
    nodes.forEach(node => {
      const nodeData = node.data as TableNodeData;
      nodeData.fields?.forEach(field => {
        const fieldPath = nodeData.isPrimary ? field.name : `${nodeData.modelKey.split('.')[1]?.toLowerCase() || node.id}__${field.name}`;
        allFields.push(fieldPath);
      });
    });
    onFieldsChange(allFields);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          onChange={(e) => { if (e.target.value) addModelToCanvas(e.target.value); e.target.value = ''; }}
          className="p-2 border rounded-lg text-sm bg-white dark:bg-gray-700"
          defaultValue=""
        >
          <option value="">➕ Add Table to Canvas...</option>
          {models.filter(m => !loadedModels.includes(m.full_key)).map(m => (
            <option key={m.full_key} value={m.full_key}>{m.verbose_name}</option>
          ))}
        </select>
        
        <button onClick={selectAllFields} disabled={nodes.length === 0}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          ☑️ Select All
        </button>
        <button onClick={() => onFieldsChange([])}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          Clear Selection
        </button>
        
        {loadedModels.length > 0 && (
          <div className="flex gap-1 items-center ml-auto">
            <span className="text-xs text-gray-500">On canvas:</span>
            {loadedModels.map((m, idx) => (
              <span key={m} className={`text-xs px-2 py-1 rounded ${idx === 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                {models.find(model => model.full_key === m)?.verbose_name}
                <button onClick={() => removeModelFromCanvas(m)} className="ml-1 text-red-500 hover:text-red-700">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Selected fields count */}
      {selectedFields.length > 0 && (
        <div className="text-sm text-purple-600 font-medium">
          ✓ {selectedFields.length} field{selectedFields.length > 1 ? 's' : ''} selected
        </div>
      )}
      
      {/* Canvas */}
      <div className="h-80 border rounded-lg bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-2">🗂️</p>
              <p>Add tables from the dropdown above</p>
              <p className="text-xs mt-1">Drag tables to position, check fields to include</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.5}
            maxZoom={1.5}
          >
            <Controls />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

