import { useEffect, useState } from 'react';
import FormRenderer from '../components/FormRenderer';
import { FormDefinition } from '../types/schema';

export default function TeamUpdatePage() {
    const [formDef, setFormDef] = useState<FormDefinition | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/team_feedback.json')
            .then(res => res.json())
            .then(data => {
                setFormDef(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load form:', err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading form...</p>
                </div>
            </div>
        );
    }

    if (!formDef) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400">Failed to load form</p>
                </div>
            </div>
        );
    }

    return <FormRenderer formDef={formDef} />;
}

