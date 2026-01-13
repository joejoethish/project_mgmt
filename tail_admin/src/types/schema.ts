export type FormItem = {
    id: string;
    title: string;
    type: 'text' | 'short' | 'paragraph' | 'choice' | 'multiple_choice' | 'checkbox' | 'date' | 'select' | 'rating';
    options?: string[];
    required?: boolean;
    placeholder?: string;
    columnSpan?: number;
};

export type Section = {
    title: string;
    description?: string;
    questions: FormItem[];
    columns?: number;
};

export type FormDefinition = {
    title: string;
    description?: string;
    sections?: Section[];
    items?: FormItem[];
};

