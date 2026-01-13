import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Plus, Edit, Trash2, Save, X, Zap, AlertCircle } from 'lucide-react';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';

interface GamificationRule {
    rule_id: string;
    name: string;
    description: string;
    credits: number;
    event_name: string;
    conditions: Record<string, any>;
    is_active: boolean;
    version: number;
    created_at: string;
}

const EVENT_TYPES = [
    { value: 'task_completed', label: 'Task Completed' },
    { value: 'bug_fixed', label: 'Bug Fixed' },
    { value: 'pr_approved', label: 'PR Approved' },
    { value: 'code_review', label: 'Code Review Given' },
    { value: 'sop_approved', label: 'SOP Checklist Approved' },
    { value: 'deployment_approved', label: 'Deployment Approved' },
    { value: 'early_delivery', label: 'Early Delivery Bonus' },
    { value: 'critical_bug_fix', label: 'Critical Bug Fix' },
    { value: 'peer_review', label: 'Peer Review Submitted' },
    { value: 'challenge_completed', label: 'Challenge Completed' },
];

const CreditRulesPage: React.FC = () => {
    const [rules, setRules] = useState<GamificationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRule, setEditingRule] = useState<GamificationRule | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        credits: 10,
        event_name: 'task_completed',
        is_active: true,
    });

    const fetchRules = async () => {
        try {
            const res = await axios.get('http://192.168.1.26:8000/api/gamification/rules/');
            setRules(res.data);
        } catch (err) {
            console.error('Failed to fetch rules', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleCreate = async () => {
        try {
            await axios.post('http://192.168.1.26:8000/api/gamification/rules/', formData);
            setIsCreating(false);
            setFormData({ name: '', description: '', credits: 10, event_name: 'task_completed', is_active: true });
            fetchRules();
        } catch (err) {
            console.error('Failed to create rule', err);
        }
    };

    const handleUpdate = async () => {
        if (!editingRule) return;
        try {
            await axios.patch(`http://192.168.1.26:8000/api/gamification/rules/${editingRule.rule_id}/`, formData);
            setEditingRule(null);
            fetchRules();
        } catch (err) {
            console.error('Failed to update rule', err);
        }
    };

    const handleDelete = async (ruleId: string) => {
        if (!confirm('Delete this rule?')) return;
        try {
            await axios.delete(`http://192.168.1.26:8000/api/gamification/rules/${ruleId}/`);
            fetchRules();
        } catch (err) {
            console.error('Failed to delete rule', err);
        }
    };

    const startEdit = (rule: GamificationRule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            description: rule.description || '',
            credits: rule.credits,
            event_name: rule.event_name,
            is_active: rule.is_active,
        });
    };

    const cancelEdit = () => {
        setEditingRule(null);
        setIsCreating(false);
        setFormData({ name: '', description: '', credits: 10, event_name: 'task_completed', is_active: true });
    };

    if (loading) {
        return (
            <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <>
            <PageBreadcrumb pageTitle="Credit Rules" />
            
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 p-2 text-white">
                        <Zap className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Credit Assignment Rules</h1>
                        <p className="text-sm text-gray-500">Configure credits for each activity type</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                    <Plus className="h-4 w-4" />
                    Add Rule
                </button>
            </div>

            {/* Info Banner */}
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>How it works:</strong> When an activity matches a rule's event type, the specified credits are automatically awarded. 
                    Rules are versioned - updates create a new version while preserving history.
                </div>
            </div>

            {/* Create/Edit Form */}
            {(isCreating || editingRule) && (
                <div className="mb-6 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                        {isCreating ? 'Create New Rule' : 'Edit Rule'}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Rule Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                placeholder="e.g., Task Completion Bonus"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Event Type</label>
                            <select
                                value={formData.event_name}
                                onChange={e => setFormData({ ...formData, event_name: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            >
                                {EVENT_TYPES.map(et => (
                                    <option key={et.value} value={et.value}>{et.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Credits</label>
                            <input
                                type="number"
                                value={formData.credits}
                                onChange={e => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                min="0"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded border-gray-300"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Active</span>
                            </label>
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            rows={2}
                            placeholder="Describe when this rule applies..."
                        />
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={isCreating ? handleCreate : handleUpdate}
                            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                        >
                            <Save className="h-4 w-4" />
                            {isCreating ? 'Create' : 'Save'}
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Rules Table */}
            <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Rule Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Event Type</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">Credits</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">Status</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">Version</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        No rules defined. Click "Add Rule" to create your first credit rule.
                                    </td>
                                </tr>
                            ) : (
                                rules.map(rule => (
                                    <tr key={rule.rule_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900 dark:text-white">{rule.name}</p>
                                            {rule.description && (
                                                <p className="text-xs text-gray-500 truncate max-w-xs">{rule.description}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                {EVENT_TYPES.find(e => e.value === rule.event_name)?.label || rule.event_name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-sm font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                <Zap className="h-3 w-3" />
                                                {rule.credits}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                rule.is_active 
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                            }`}>
                                                {rule.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                                            v{rule.version}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => startEdit(rule)}
                                                className="mr-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-gray-700"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(rule.rule_id)}
                                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default CreditRulesPage;

