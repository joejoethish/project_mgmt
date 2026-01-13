// TypeScript types for Dynamic CRUD System

export interface User {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
}

export type FieldType =
    | 'text'
    | 'number'
    | 'email'
    | 'phone'
    | 'select'
    | 'date'
    | 'datetime'
    | 'boolean'
    | 'textarea'
    | 'url'
    | 'color';

export interface DynamicMasterField {
    id?: number;
    field_name: string;
    display_name: string;
    field_type: FieldType;
    is_required: boolean;
    is_unique: boolean;
    max_length?: number;
    min_value?: number;
    max_value?: number;
    default_value?: string;
    choices_json?: string[];
    order: number;
    help_text?: string;
    placeholder?: string;
    show_in_list: boolean;
    show_in_form: boolean;
}

export interface DynamicMaster {
    id: number;
    name: string;
    display_name: string;
    description: string;
    icon: string;
    table_name: string;
    is_searchable: boolean;
    is_exportable: boolean;
    allow_duplicate: boolean;
    fields: DynamicMasterField[];
    created_by?: User;
    created_at: string;
    updated_at: string;
    is_active: boolean;
    record_count: number;
}

export interface DynamicMasterData {
    id: number;
    data: Record<string, any>;
    created_at: string;
    updated_at: string;
    created_by?: User;
    updated_by?: User;
    is_active: boolean;
}

export interface CreateMasterRequest {
    name: string;
    display_name: string;
    description?: string;
    icon?: string;
    is_searchable?: boolean;
    is_exportable?: boolean;
    allow_duplicate?: boolean;
    fields: Omit<DynamicMasterField, 'id'>[];
}

export interface CreateDataRequest {
    data: Record<string, any>;
}

export interface BulkCreateRequest {
    records: Record<string, any>[];
}

export interface BulkCreateResponse {
    created: number;
    failed: number;
    created_records: DynamicMasterData[];
    errors: Array<{
        index: number;
        errors: Record<string, string[]>;
    }>;
}

