import { Node, Edge } from '@xyflow/react';

// Helper: Extract field name from handle ID
function extractFieldName(handleId: string | null | undefined): string {
    if (!handleId) return 'id';
    return handleId.replace('-source', '').replace('-target', '');
}

// Helper: Convert to PascalCase
function toPascalCase(str: string): string {
    return str
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

// Helper: Convert to snake_case
function toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// ==================== JSON EXPORT ====================

export function generateJSON(nodes: Node[], edges: Edge[]): string {
    const masters = nodes.map(node => ({
        name: node.id,
        display_name: node.data.label,
        icon: node.data.icon || '📋',
        description: node.data.description || '',
        fields: node.data.fields || [],
        settings: {
            searchable: node.data.searchable ?? true,
            exportable: node.data.exportable ?? true,
            soft_delete: node.data.soft_delete ?? false,
        },
    }));

    const relationships = edges.map(edge => ({
        id: edge.id,
        source_master: edge.source,
        source_field: extractFieldName(edge.sourceHandle),
        target_master: edge.target,
        target_field: extractFieldName(edge.targetHandle),
        relationship_type: edge.label || '1-to-many',
        on_delete: edge.data?.onDelete || 'CASCADE',
        on_update: edge.data?.onUpdate || 'CASCADE',
        related_name: edge.data?.relatedName || '',
    }));

    return JSON.stringify(
        {
            schema_version: '1.0',
            generated_at: new Date().toISOString(),
            masters,
            relationships,
        },
        null,
        2
    );
}

// ==================== SQL DDL EXPORT ====================

function mapToSQLType(fieldType: string, maxLength?: number): string {
    const mapping: Record<string, string> = {
        text: `VARCHAR(${maxLength || 255})`,
        email: 'VARCHAR(255)',
        url: 'VARCHAR(500)',
        number: 'DECIMAL(10,2)',
        uuid: 'UUID',
        date: 'DATE',
        datetime: 'TIMESTAMP',
        boolean: 'BOOLEAN',
        json: 'JSONB',
    };
    return mapping[fieldType] || 'VARCHAR(255)';
}

export function generateSQL(nodes: Node[], edges: Edge[]): string {
    let sql = '-- Generated SQL DDL for PostgreSQL\n';
    sql += `-- Generated at: ${new Date().toISOString()}\n`;
    sql += '-- Total tables: ' + nodes.length + '\n\n';

    // Create tables
    nodes.forEach((node, index) => {
        sql += `-- Table ${index + 1}: ${node.data.label}\n`;
        sql += `CREATE TABLE ${node.id} (\n`;

        const fieldDefs = ((node.data.fields || []) as Array<{name: string; type: string; maxLength?: number; isPrimary?: boolean; required?: boolean; unique?: boolean; defaultValue?: string}>).map((field) => {
            const type = mapToSQLType(field.type, field.maxLength);
            const constraints = [];

            if (field.isPrimary) {
                constraints.push('PRIMARY KEY');
            }
            if (field.required && !field.isPrimary) {
                constraints.push('NOT NULL');
            }
            if (field.unique && !field.isPrimary) {
                constraints.push('UNIQUE');
            }
            if (field.defaultValue) {
                constraints.push(`DEFAULT '${field.defaultValue}'`);
            }

            return `    ${field.name} ${type}${constraints.length ? ' ' + constraints.join(' ') : ''}`;
        });

        sql += fieldDefs.join(',\n');
        sql += '\n);\n\n';

        // Add table comment
        if (node.data.description) {
            sql += `COMMENT ON TABLE ${node.id} IS '${node.data.description}';\n\n`;
        }
    });

    // Add foreign key constraints
    if (edges.length > 0) {
        sql += '-- Foreign Key Constraints\n';
        edges.forEach((edge) => {
            const sourceField = extractFieldName(edge.sourceHandle);
            const targetField = extractFieldName(edge.targetHandle);

            sql += `ALTER TABLE ${edge.source}\n`;
            sql += `    ADD CONSTRAINT fk_${edge.source}_${sourceField}\n`;
            sql += `    FOREIGN KEY (${sourceField})\n`;
            sql += `    REFERENCES ${edge.target}(${targetField})\n`;
            sql += `    ON DELETE ${edge.data?.onDelete || 'CASCADE'}\n`;
            sql += `    ON UPDATE ${edge.data?.onUpdate || 'CASCADE'};\n\n`;
        });
    }

    // Add indexes for foreign keys
    if (edges.length > 0) {
        sql += '-- Indexes for Foreign Keys\n';
        edges.forEach(edge => {
            const sourceField = extractFieldName(edge.sourceHandle);
            sql += `CREATE INDEX idx_${edge.source}_${sourceField} ON ${edge.source}(${sourceField});\n`;
        });
    }

    return sql;
}

// ==================== DJANGO MODELS EXPORT ====================

function mapToDjangoField(fieldType: string): string {
    const mapping: Record<string, string> = {
        text: 'CharField',
        email: 'EmailField',
        url: 'URLField',
        number: 'DecimalField',
        uuid: 'UUIDField',
        date: 'DateField',
        datetime: 'DateTimeField',
        boolean: 'BooleanField',
        json: 'JSONField',
    };
    return mapping[fieldType] || 'CharField';
}

export function generateDjango(nodes: Node[], edges: Edge[]): string {
    let py = '"""Generated Django Models"""\n';
    py += 'import uuid\n';
    py += 'from django.db import models\n\n';

    nodes.forEach((node) => {
        const className = toPascalCase(node.id);

        if (node.data.description) {
            py += `\nclass ${className}(models.Model):\n`;
            py += `    """${node.data.description}"""\n`;
        } else {
            py += `\nclass ${className}(models.Model):\n`;
        }

        // Fields
        ((node.data.fields || []) as Array<{name: string; type: string; maxLength?: number; isPrimary?: boolean; isForeign?: boolean; required?: boolean; unique?: boolean; defaultValue?: string; helpText?: string}>).forEach((field) => {
            // Handle UUID primary key specially
            if (field.isPrimary && field.type === 'uuid') {
                py += `    ${field.name} = models.UUIDField(\n`;
                py += `        primary_key=True,\n`;
                py += `        default=uuid.uuid4,\n`;
                py += `        editable=False\n`;
                py += `    )\n`;
            } else if (field.isForeign) {
                // Foreign key - we'll determine the target from edges
                const relationship = edges.find(e =>
                    e.source === node.id && extractFieldName(e.sourceHandle) === field.name
                );

                if (relationship) {
                    const targetModel = toPascalCase(relationship.target);
                    const onDelete = relationship.data?.onDelete === 'SET NULL' ? 'SET_NULL' : relationship.data?.onDelete || 'CASCADE';

                    py += `    ${field.name.replace('_id', '')} = models.ForeignKey(\n`;
                    py += `        '${targetModel}',\n`;
                    py += `        on_delete=models.${onDelete},\n`;
                    if (relationship.data?.relatedName) {
                        py += `        related_name='${relationship.data.relatedName}',\n`;
                    }
                    if (!field.required) {
                        py += `        null=True,\n`;
                        py += `        blank=True,\n`;
                    }
                    py += `    )\n`;
                }
            } else {
                const fieldType = mapToDjangoField(field.type);
                const options: string[] = [];

                if (field.maxLength && field.type === 'text') {
                    options.push(`max_length=${field.maxLength}`);
                }
                if (field.type === 'number') {
                    options.push('max_digits=10');
                    options.push('decimal_places=2');
                }
                if (!field.required) {
                    options.push('blank=True');
                    options.push('null=True');
                }
                if (field.unique && !field.isPrimary) {
                    options.push('unique=True');
                }
                if (field.defaultValue) {
                    options.push(`default='${field.defaultValue}'`);
                }
                if (field.helpText) {
                    options.push(`help_text='${field.helpText}'`);
                }

                py += `    ${field.name} = models.${fieldType}(${options.join(', ')})\n`;
            }
        });

        // Meta class
        py += `\n    class Meta:\n`;
        py += `        db_table = '${node.id}'\n`;
        py += `        verbose_name = '${node.data.label}'\n`;
        py += `        verbose_name_plural = '${node.data.label}s'\n`;

        // __str__ method
        py += `\n    def __str__(self):\n`;
        const nameField = ((node.data.fields || []) as Array<{name: string}>).find((f) =>
            f.name === 'name' || f.name === 'title' || f.name === 'email'
        );
        if (nameField) {
            py += `        return str(self.${nameField.name})\n`;
        } else {
            py += `        return str(self.id)\n`;
        }

        py += '\n';
    });

    return py;
}

// ==================== SQLALCHEMY EXPORT ====================

function mapToSQLAlchemyType(fieldType: string): string {
    const mapping: Record<string, string> = {
        text: 'String(255)',
        email: 'String(255)',
        url: 'String(500)',
        number: 'Numeric(10, 2)',
        uuid: 'String(36)',
        date: 'Date',
        datetime: 'DateTime',
        boolean: 'Boolean',
        json: 'JSON',
    };
    return mapping[fieldType] || 'String(255)';
}

export function generateSQLAlchemy(nodes: Node[], edges: Edge[]): string {
    let py = '"""Generated SQLAlchemy Models"""\n';
    py += 'from sqlalchemy import Column, Integer, String, Boolean, Numeric\n';
    py += 'from sqlalchemy import Date, DateTime, ForeignKey, JSON\n';
    py += 'from sqlalchemy.ext.declarative import declarative_base\n';
    py += 'from sqlalchemy.orm import relationship\n\n';
    py += 'Base = declarative_base()\n\n';

    nodes.forEach(node => {
        const className = toPascalCase(node.id);
        py += `\nclass ${className}(Base):\n`;

        if (node.data.description) {
            py += `    """${node.data.description}"""\n`;
        }

        py += `    __tablename__ = '${node.id}'\n\n`;

        // Fields
        ((node.data.fields || []) as Array<{name: string; type: string; isForeign?: boolean; isPrimary?: boolean; required?: boolean; unique?: boolean}>).forEach((field) => {
            if (field.isForeign) {
                // Foreign key column
                const relationship = edges.find(e =>
                    e.source === node.id && extractFieldName(e.sourceHandle) === field.name
                );

                if (relationship) {
                    const targetField = extractFieldName(relationship.targetHandle);
                    py += `    ${field.name} = Column(String(36), ForeignKey('${relationship.target}.${targetField}')`;

                    if (!field.required) {
                        py += ', nullable=True';
                    }
                    py += ')\n';
                }
            } else {
                const columnType = mapToSQLAlchemyType(field.type);
                const constraints: string[] = [];

                if (field.isPrimary) {
                    constraints.push('primary_key=True');
                }
                if (!field.required && !field.isPrimary) {
                    constraints.push('nullable=True');
                }
                if (field.unique && !field.isPrimary) {
                    constraints.push('unique=True');
                }

                py += `    ${field.name} = Column(${columnType}`;
                if (constraints.length > 0) {
                    py += ', ' + constraints.join(', ');
                }
                py += ')\n';
            }
        });

        // Relationships
        const outgoingRels = edges.filter(e => e.source === node.id);
        outgoingRels.forEach(edge => {
            const targetModel = toPascalCase(edge.target);
            const relName = (edge.data?.relatedName as string) || toSnakeCase(`${targetModel}_rel`);

            py += `\n    # Relationship to ${targetModel}\n`;
            py += `    ${relName} = relationship('${targetModel}', back_populates='${node.id}_set')\n`;
        });

        py += '\n';
    });

    return py;
}

// ==================== EXPORT DISPATCHER ====================

export type ExportFormat = 'json' | 'sql' | 'django' | 'sqlalchemy';

export function generateExport(
    format: ExportFormat,
    nodes: Node[],
    edges: Edge[]
): string {
    switch (format) {
        case 'json':
            return generateJSON(nodes, edges);
        case 'sql':
            return generateSQL(nodes, edges);
        case 'django':
            return generateDjango(nodes, edges);
        case 'sqlalchemy':
            return generateSQLAlchemy(nodes, edges);
        default:
            throw new Error(`Unsupported export format: ${format}`);
    }
}

// ==================== FILE DOWNLOAD HELPER ====================

export function downloadFile(content: string, filename: string, format: ExportFormat): void {
    const extensions: Record<ExportFormat, string> = {
        json: 'json',
        sql: 'sql',
        django: 'py',
        sqlalchemy: 'py',
    };

    const ext = extensions[format];
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

