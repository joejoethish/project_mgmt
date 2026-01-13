import { useState, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';

export interface MasterSchema {
    id: number;
    name: string;
    description: string;
    schema_data: {
        nodes: Node[];
        edges: Edge[];
        metadata?: {
            created_with: string;
            version: string;
        };
    };
    created_by?: {
        id: number;
        username: string;
        email: string;
    };
    created_at: string;
    updated_at: string;
    version: number;
    is_active: boolean;
    master_count: number;
    relationship_count: number;
}

const API_BASE_URL = 'http://192.168.1.26:8000/api/masters';

export function useMasterSchema() {
    const [schemas, setSchemas] = useState<MasterSchema[]>([]);
    const [currentSchema, setCurrentSchema] = useState<MasterSchema | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load all schemas
    const loadSchemas = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/schemas/`);
            if (!response.ok) {
                throw new Error('Failed to load schemas');
            }
            const data = await response.json();
            setSchemas(data);
            return data;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Load specific schema
    const loadSchema = useCallback(async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/schemas/${id}/`);
            if (!response.ok) {
                throw new Error('Failed to load schema');
            }
            const data = await response.json();
            setCurrentSchema(data);
            return data;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Save schema (create or update)
    const saveSchema = useCallback(async (
        name: string,
        nodes: Node[],
        edges: Edge[],
        description: string = '',
        schemaId?: number
    ) => {
        setLoading(true);
        setError(null);
        try {
            const schemaData = {
                nodes,
                edges,
                metadata: {
                    created_with: 'Visual Master Builder',
                    version: '1.0',
                },
            };

            const payload = {
                name,
                description,
                schema_data: schemaData,
            };

            const url = schemaId
                ? `${API_BASE_URL}/schemas/${schemaId}/`
                : `${API_BASE_URL}/schemas/`;

            const method = schemaId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save schema');
            }

            const data = await response.json();
            setCurrentSchema(data);

            // Refresh schemas list
            await loadSchemas();

            return data;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [loadSchemas]);

    // Delete schema
    const deleteSchema = useCallback(async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/schemas/${id}/`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete schema');
            }

            // Refresh schemas list
            await loadSchemas();

            // Clear current if deleted
            if (currentSchema?.id === id) {
                setCurrentSchema(null);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [loadSchemas, currentSchema]);

    // Duplicate schema
    const duplicateSchema = useCallback(async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/schemas/${id}/duplicate/`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to duplicate schema');
            }

            const data = await response.json();

            // Refresh schemas list
            await loadSchemas();

            return data;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [loadSchemas]);

    return {
        schemas,
        currentSchema,
        loading,
        error,
        loadSchemas,
        loadSchema,
        saveSchema,
        deleteSchema,
        duplicateSchema,
        setCurrentSchema,
    };
}

