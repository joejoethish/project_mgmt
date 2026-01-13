import { Node, Edge } from '@xyflow/react';

export interface ImportResult {
    nodes: Node[];
    edges: Edge[];
    errors: string[];
    warnings: string[];
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

// Auto-layout algorithm - Grid layout
export function autoLayoutPosition(index: number, total: number): { x: number; y: number } {
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;

    return {
        x: 100 + (col * 400),
        y: 100 + (row * 300),
    };
}

// Validate JSON schema structure
export function validateSchema(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for masters array
    if (!data.masters || !Array.isArray(data.masters)) {
        errors.push('Missing or invalid "masters" array');
        return { valid: false, errors, warnings };
    }

    if (data.masters.length === 0) {
        errors.push('No masters found in JSON');
        return { valid: false, errors, warnings };
    }

    // Validate each master
    data.masters.forEach((master: any, index: number) => {
        if (!master.name) {
            errors.push(`Master ${index + 1}: Missing "name" field`);
        }

        if (!master.fields || !Array.isArray(master.fields)) {
            errors.push(`Master "${master.name || index + 1}": Missing or invalid "fields" array`);
        } else {
            if (master.fields.length === 0) {
                warnings.push(`Master "${master.name}": No fields defined`);
            }

            // Check for primary key
            const hasPrimary = master.fields.some((f: any) => f.isPrimary);
            if (!hasPrimary) {
                warnings.push(`Master "${master.name}": No primary key defined (will use first field)`);
            }

            // Validate field structure
            master.fields.forEach((field: any, fieldIndex: number) => {
                if (!field.name) {
                    errors.push(`Master "${master.name}", Field ${fieldIndex + 1}: Missing "name"`);
                }
                if (!field.type) {
                    warnings.push(`Master "${master.name}", Field "${field.name}": Missing type (will default to "text")`);
                }
            });
        }
    });

    // Validate relationships
    if (data.relationships && Array.isArray(data.relationships)) {
        const masterNames = new Set(data.masters.map((m: any) => m.name));

        data.relationships.forEach((rel: any, index: number) => {
            if (!rel.source_master) {
                errors.push(`Relationship ${index + 1}: Missing "source_master"`);
            }
            if (!rel.target_master) {
                errors.push(`Relationship ${index + 1}: Missing "target_master"`);
            }
            if (!rel.source_field) {
                errors.push(`Relationship ${index + 1}: Missing "source_field"`);
            }
            if (!rel.target_field) {
                errors.push(`Relationship ${index + 1}: Missing "target_field"`);
            }

            // Check if masters exist
            if (rel.source_master && !masterNames.has(rel.source_master)) {
                warnings.push(`Relationship: Source master "${rel.source_master}" not found in imported masters`);
            }
            if (rel.target_master && !masterNames.has(rel.target_master)) {
                warnings.push(`Relationship: Target master "${rel.target_master}" not found in imported masters`);
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

// Parse JSON and convert to ReactFlow nodes/edges
export function parseJSONSchema(
    jsonText: string,
    handleFieldClick: (field: any, node: any) => void,
    handleAddField: (masterId: string) => void
): ImportResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        // Parse JSON
        const data = JSON.parse(jsonText);

        // Validate structure
        const validation = validateSchema(data);
        if (!validation.valid) {
            return {
                nodes: [],
                edges: [],
                errors: validation.errors,
                warnings: validation.warnings,
            };
        }

        // Add warnings from validation
        warnings.push(...validation.warnings);

        // Convert masters to nodes
        const nodes: Node[] = data.masters.map((master: any, index: number) => {
            // Ensure fields have required properties
            const fields = (master.fields || []).map((field: any, fieldIndex: number) => {
                // Auto-set first field as primary if none specified
                const isPrimary = field.isPrimary || (fieldIndex === 0 && !master.fields.some((f: any) => f.isPrimary));

                return {
                    name: field.name,
                    label: field.label || field.name,
                    type: field.type || 'text',
                    isPrimary,
                    required: field.required ?? isPrimary,
                    unique: field.unique ?? isPrimary,
                    isForeign: field.isForeign || false,
                    maxLength: field.maxLength,
                    minValue: field.minValue,
                    maxValue: field.maxValue,
                    defaultValue: field.defaultValue,
                    helpText: field.helpText,
                    placeholder: field.placeholder,
                };
            });

            return {
                id: master.name,
                type: 'masterNode',
                position: autoLayoutPosition(index, data.masters.length),
                data: {
                    label: master.display_name || master.name,
                    icon: master.icon || '📋',
                    description: master.description || '',
                    fields,
                    searchable: master.settings?.searchable ?? true,
                    exportable: master.settings?.exportable ?? true,
                    soft_delete: master.settings?.soft_delete ?? false,
                    onFieldClick: handleFieldClick,
                    onAddField: handleAddField,
                },
            };
        });

        // Convert relationships to edges
        const edges: Edge[] = (data.relationships || []).map((rel: any, index: number) => ({
            id: `imported_${Date.now()}_${index}`,
            source: rel.source_master,
            target: rel.target_master,
            sourceHandle: `${rel.source_field}-source`,
            targetHandle: `${rel.target_field}-target`,
            type: 'smoothstep',
            animated: true,
            label: rel.type || rel.relationship_type || '1-to-many',
            data: {
                sourceField: rel.source_field,
                targetMaster: rel.target_master,
                targetField: rel.target_field,
                type: rel.type || rel.relationship_type || '1-to-many',
                onDelete: rel.on_delete || 'CASCADE',
                onUpdate: rel.on_update || 'CASCADE',
                relatedName: rel.related_name || '',
            },
        }));

        return {
            nodes,
            edges,
            errors,
            warnings,
        };
    } catch (error) {
        if (error instanceof SyntaxError) {
            errors.push(`Invalid JSON syntax: ${error.message}`);
        } else {
            errors.push(`Error parsing JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return {
            nodes: [],
            edges: [],
            errors,
            warnings,
        };
    }
}

// Check for duplicate master names
export function checkDuplicates(
    importedNodes: Node[],
    existingNodes: Node[]
): { duplicates: string[]; conflicts: Array<{ name: string; action: 'skip' | 'rename' }> } {
    const existingNames = new Set(existingNodes.map(n => n.id));
    const duplicates: string[] = [];
    const conflicts: Array<{ name: string; action: 'skip' | 'rename' }> = [];

    importedNodes.forEach(node => {
        if (existingNames.has(node.id)) {
            duplicates.push(node.id);
            conflicts.push({ name: node.id, action: 'skip' });
        }
    });

    return { duplicates, conflicts };
}

// Merge imported nodes with existing, handling duplicates
export function mergeNodes(
    importedNodes: Node[],
    existingNodes: Node[],
    skipDuplicates: boolean = true
): Node[] {
    if (skipDuplicates) {
        const existingIds = new Set(existingNodes.map(n => n.id));
        const filteredImported = importedNodes.filter(n => !existingIds.has(n.id));
        return [...existingNodes, ...filteredImported];
    } else {
        // Replace duplicates
        const existingIds = new Set(importedNodes.map(n => n.id));
        const filtered = existingNodes.filter(n => !existingIds.has(n.id));
        return [...filtered, ...importedNodes];
    }
}

