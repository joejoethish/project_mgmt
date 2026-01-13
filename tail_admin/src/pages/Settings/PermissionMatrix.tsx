import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronRight, Check, X, Loader2, Shield, Users, CheckCheck, XCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.1.26:8000/api/pm';

interface Role {
    role_id: string;
    name: string;
}

interface Resource {
    id: string;
    name: string;
    permission_prefix: string;
    actions: string[];
}

interface Category {
    name: string;
    icon: string;
    resources: Resource[];
}

interface RolePermission {
    role_permission_id: string;
    role_id: string;
    permission_id: string;
}

interface Permission {
    permission_id: string;
    name: string;
}

// Action labels and icons
const ACTION_CONFIG: Record<string, { label: string; color: string; activeColor: string }> = {
    view: { label: 'View', color: 'bg-blue-50 text-blue-600 border-blue-200', activeColor: 'bg-blue-500 text-white' },
    add: { label: 'Add', color: 'bg-green-50 text-green-600 border-green-200', activeColor: 'bg-green-500 text-white' },
    edit: { label: 'Edit', color: 'bg-amber-50 text-amber-600 border-amber-200', activeColor: 'bg-amber-500 text-white' },
    delete: { label: 'Delete', color: 'bg-red-50 text-red-600 border-red-200', activeColor: 'bg-red-500 text-white' },
    manage: { label: 'Manage', color: 'bg-purple-50 text-purple-600 border-purple-200', activeColor: 'bg-purple-500 text-white' },
};

export default function PermissionMatrix() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [rolesRes, resourcesRes, permsRes, rpRes] = await Promise.all([
                axios.get(`${API_BASE}/roles/`),
                axios.get(`${API_BASE}/permission-resources/`),
                axios.get(`${API_BASE}/permissions/`),
                axios.get(`${API_BASE}/rolepermissions/`)
            ]);
            setRoles(rolesRes.data);
            setCategories(resourcesRes.data.categories || []);
            setPermissions(permsRes.data);
            setRolePermissions(rpRes.data);
            
            if (rolesRes.data.length > 0 && !selectedRoleId) {
                setSelectedRoleId(rolesRes.data[0].role_id);
            }
        } catch (error) {
            console.error("Failed to fetch matrix data", error);
        } finally {
            setLoading(false);
        }
    };

    const selectedRole = roles.find(r => r.role_id === selectedRoleId);

    // Build permission name from resource and action
    const getPermissionName = (resource: Resource, action: string): string => {
        if (resource.actions.length === 1 && resource.actions[0] === 'view' && resource.permission_prefix.startsWith('view_menu_')) {
            return resource.permission_prefix;
        }
        return `${action}_${resource.permission_prefix}`;
    };

    // Get permission ID by name
    const getPermissionId = (permName: string): string | null => {
        const perm = permissions.find(p => p.name === permName);
        return perm ? perm.permission_id : null;
    };

    // Check if role has permission
    const hasPermission = (roleId: string, permName: string): boolean => {
        const permId = getPermissionId(permName);
        if (!permId) return false;
        return rolePermissions.some(rp => rp.role_id === roleId && rp.permission_id === permId);
    };

    // Get role permission ID
    const getRolePermissionId = (roleId: string, permName: string): string | null => {
        const permId = getPermissionId(permName);
        if (!permId) return null;
        const rp = rolePermissions.find(rp => rp.role_id === roleId && rp.permission_id === permId);
        return rp ? rp.role_permission_id : null;
    };

    // Toggle single permission
    const handleToggle = async (resource: Resource, action: string) => {
        if (!selectedRoleId) return;
        
        const permName = getPermissionName(resource, action);
        const permId = getPermissionId(permName);
        
        if (!permId) {
            console.warn(`Permission not found: ${permName}`);
            return;
        }

        const key = `${selectedRoleId}-${permName}`;
        if (processing) return;
        setProcessing(key);

        const existsId = getRolePermissionId(selectedRoleId, permName);

        try {
            if (existsId) {
                await axios.delete(`${API_BASE}/rolepermissions/${existsId}/`);
                setRolePermissions(prev => prev.filter(rp => rp.role_permission_id !== existsId));
            } else {
                const res = await axios.post(`${API_BASE}/rolepermissions/`, {
                    role_id: selectedRoleId,
                    permission_id: permId
                });
                setRolePermissions(prev => [...prev, res.data]);
            }
        } catch (error) {
            console.error("Failed to toggle permission", error);
        } finally {
            setProcessing(null);
        }
    };

    // ============== BULK ACTIONS ==============

    // Bulk toggle for a resource (all actions)
    const handleBulkToggleResource = async (resource: Resource, grant: boolean) => {
        if (!selectedRoleId || processing) return;
        setProcessing(`bulk-resource-${resource.id}`);

        try {
            for (const action of resource.actions) {
                const permName = getPermissionName(resource, action);
                const permId = getPermissionId(permName);
                if (!permId) continue;

                const existsId = getRolePermissionId(selectedRoleId, permName);

                if (grant && !existsId) {
                    const res = await axios.post(`${API_BASE}/rolepermissions/`, {
                        role_id: selectedRoleId,
                        permission_id: permId
                    });
                    setRolePermissions(prev => [...prev, res.data]);
                } else if (!grant && existsId) {
                    await axios.delete(`${API_BASE}/rolepermissions/${existsId}/`);
                    setRolePermissions(prev => prev.filter(rp => rp.role_permission_id !== existsId));
                }
            }
        } catch (error) {
            console.error("Failed to bulk toggle resource", error);
        } finally {
            setProcessing(null);
        }
    };

    // Bulk toggle for a category (all resources, all actions)
    const handleBulkToggleCategory = async (category: Category, grant: boolean) => {
        if (!selectedRoleId || processing) return;
        setProcessing(`bulk-category-${category.name}`);

        try {
            for (const resource of category.resources) {
                for (const action of resource.actions) {
                    const permName = getPermissionName(resource, action);
                    const permId = getPermissionId(permName);
                    if (!permId) continue;

                    const existsId = getRolePermissionId(selectedRoleId, permName);

                    if (grant && !existsId) {
                        const res = await axios.post(`${API_BASE}/rolepermissions/`, {
                            role_id: selectedRoleId,
                            permission_id: permId
                        });
                        setRolePermissions(prev => [...prev, res.data]);
                    } else if (!grant && existsId) {
                        await axios.delete(`${API_BASE}/rolepermissions/${existsId}/`);
                        setRolePermissions(prev => prev.filter(rp => rp.role_permission_id !== existsId));
                    }
                }
            }
        } catch (error) {
            console.error("Failed to bulk toggle category", error);
        } finally {
            setProcessing(null);
        }
    };

    // Bulk toggle by action type for a category
    const handleBulkToggleAction = async (category: Category, action: string, grant: boolean) => {
        if (!selectedRoleId || processing) return;
        setProcessing(`bulk-action-${category.name}-${action}`);

        try {
            for (const resource of category.resources) {
                if (!resource.actions.includes(action)) continue;
                
                const permName = getPermissionName(resource, action);
                const permId = getPermissionId(permName);
                if (!permId) continue;

                const existsId = getRolePermissionId(selectedRoleId, permName);

                if (grant && !existsId) {
                    const res = await axios.post(`${API_BASE}/rolepermissions/`, {
                        role_id: selectedRoleId,
                        permission_id: permId
                    });
                    setRolePermissions(prev => [...prev, res.data]);
                } else if (!grant && existsId) {
                    await axios.delete(`${API_BASE}/rolepermissions/${existsId}/`);
                    setRolePermissions(prev => prev.filter(rp => rp.role_permission_id !== existsId));
                }
            }
        } catch (error) {
            console.error("Failed to bulk toggle action", error);
        } finally {
            setProcessing(null);
        }
    };

    // Check if all permissions of a type are granted in a category
    const getCategoryActionStats = (category: Category, action: string): { granted: number; total: number } => {
        if (!selectedRoleId) return { granted: 0, total: 0 };
        
        let granted = 0;
        let total = 0;
        
        category.resources.forEach(resource => {
            if (resource.actions.includes(action)) {
                total++;
                const permName = getPermissionName(resource, action);
                if (hasPermission(selectedRoleId, permName)) {
                    granted++;
                }
            }
        });
        
        return { granted, total };
    };

    // Toggle category collapse
    const toggleCategory = (categoryName: string) => {
        setCollapsedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryName)) {
                newSet.delete(categoryName);
            } else {
                newSet.add(categoryName);
            }
            return newSet;
        });
    };

    // Count permissions for selected role in a category
    const getCategoryStats = (category: Category): { granted: number; total: number } => {
        if (!selectedRoleId) return { granted: 0, total: 0 };
        
        let granted = 0;
        let total = 0;
        
        category.resources.forEach(resource => {
            resource.actions.forEach(action => {
                total++;
                const permName = getPermissionName(resource, action);
                if (hasPermission(selectedRoleId, permName)) {
                    granted++;
                }
            });
        });
        
        return { granted, total };
    };

    // Check if all actions granted for a resource
    const isResourceFullyGranted = (resource: Resource): boolean => {
        if (!selectedRoleId) return false;
        return resource.actions.every(action => {
            const permName = getPermissionName(resource, action);
            return hasPermission(selectedRoleId, permName);
        });
    };

    // Filter resources by search term
    const filteredCategories = useMemo(() => {
        if (!searchTerm) return categories;
        
        return categories.map(cat => ({
            ...cat,
            resources: cat.resources.filter(r => 
                r.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
        })).filter(cat => cat.resources.length > 0);
    }, [categories, searchTerm]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
                            <Shield className="w-6 h-6 text-purple-600" />
                            Permission Matrix
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            Manage access control for {selectedRole?.name || 'selected role'}
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Role Selector */}
                        <div className="relative">
                            <Users className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                            <select
                                value={selectedRoleId || ''}
                                onChange={(e) => setSelectedRoleId(e.target.value)}
                                className="pl-10 pr-8 py-2 w-48 border border-gray-200 dark:border-gray-700 rounded-lg 
                                         bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-purple-500
                                         appearance-none cursor-pointer font-medium"
                            >
                                {roles.map(role => (
                                    <option key={role.role_id} value={role.role_id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                        
                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search resources..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 w-56 border border-gray-200 dark:border-gray-700 rounded-lg 
                                         bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Permission Cards */}
            <div className="space-y-4">
                {filteredCategories.map(category => {
                    const stats = getCategoryStats(category);
                    const isCollapsed = collapsedCategories.has(category.name);
                    const isBulkProcessing = processing?.startsWith('bulk-');
                    
                    return (
                        <div key={category.name} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            {/* Category Header */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-850">
                                <div 
                                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                                    onClick={() => toggleCategory(category.name)}
                                >
                                    {isCollapsed ? (
                                        <ChevronRight className="w-5 h-5 text-gray-500" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                    )}
                                    <span className="text-2xl">{category.icon}</span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{category.name}</span>
                                    <span className="text-xs text-gray-400">({category.resources.length} resources)</span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    {/* Stats */}
                                    <div className="text-sm font-medium text-gray-500 hidden sm:block">
                                        {stats.granted}/{stats.total}
                                    </div>
                                    <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden hidden sm:block">
                                        <div 
                                            className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300"
                                            style={{ width: `${stats.total > 0 ? (stats.granted / stats.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                    
                                    {/* Bulk Actions */}
                                    <div className="flex gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleBulkToggleCategory(category, true); }}
                                            disabled={isBulkProcessing}
                                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                            title="Grant All"
                                        >
                                            <CheckCheck className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleBulkToggleCategory(category, false); }}
                                            disabled={isBulkProcessing}
                                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Revoke All"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Action Quick Toggles */}
                            {!isCollapsed && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                                    <span className="text-xs text-gray-500 mr-2">Quick:</span>
                                    {['view', 'add', 'edit', 'delete'].map(action => {
                                        const actionStats = getCategoryActionStats(category, action);
                                        if (actionStats.total === 0) return null;
                                        
                                        const allGranted = actionStats.granted === actionStats.total;
                                        
                                        return (
                                            <button
                                                key={action}
                                                onClick={() => handleBulkToggleAction(category, action, !allGranted)}
                                                disabled={isBulkProcessing}
                                                className={`px-2 py-1 text-xs rounded-md border transition-all ${
                                                    allGranted
                                                        ? ACTION_CONFIG[action].activeColor + ' border-transparent'
                                                        : ACTION_CONFIG[action].color
                                                } ${isBulkProcessing ? 'opacity-50' : 'hover:shadow-sm'}`}
                                            >
                                                {allGranted ? '✓ ' : ''}{ACTION_CONFIG[action].label} ({actionStats.granted}/{actionStats.total})
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            
                            {/* Resource List */}
                            {!isCollapsed && (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {category.resources.map(resource => {
                                        const isFullyGranted = isResourceFullyGranted(resource);
                                        
                                        return (
                                            <div key={resource.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors">
                                                <div className="flex items-center gap-2 min-w-[200px]">
                                                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                        {resource.name}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {/* Row ALL toggle button */}
                                                    <button
                                                        onClick={() => handleBulkToggleResource(resource, !isFullyGranted)}
                                                        disabled={isBulkProcessing}
                                                        className={`w-16 h-9 rounded-lg border flex items-center justify-center gap-1 text-sm font-medium transition-all duration-200 ${
                                                            isFullyGranted
                                                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-transparent shadow-sm'
                                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                                                        } ${isBulkProcessing ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                                                        title={isFullyGranted ? 'Revoke All' : 'Grant All'}
                                                    >
                                                        {isFullyGranted ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                        All
                                                    </button>

                                                    {['view', 'add', 'edit', 'delete'].map(action => {
                                                        const isAvailable = resource.actions.includes(action);
                                                        if (!isAvailable) {
                                                            return (
                                                                <div key={action} className="w-20 h-9 flex items-center justify-center text-gray-300 dark:text-gray-600">
                                                                    —
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        const permName = getPermissionName(resource, action);
                                                        const isChecked = selectedRoleId ? hasPermission(selectedRoleId, permName) : false;
                                                        const isProcessing = processing === `${selectedRoleId}-${permName}`;
                                                        const config = ACTION_CONFIG[action];
                                                        
                                                        return (
                                                            <button
                                                                key={action}
                                                                onClick={() => handleToggle(resource, action)}
                                                                disabled={isProcessing || isBulkProcessing}
                                                                className={`w-20 h-9 rounded-lg border flex items-center justify-center gap-1.5 text-sm font-medium transition-all duration-200 ${
                                                                    isChecked
                                                                        ? config.activeColor + ' border-transparent shadow-sm'
                                                                        : config.color + ' hover:shadow-sm'
                                                                } ${(isProcessing || isBulkProcessing) ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                                                            >
                                                                {isProcessing ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : isChecked ? (
                                                                    <>
                                                                        <Check className="w-4 h-4" />
                                                                        {config.label}
                                                                    </>
                                                                ) : (
                                                                    config.label
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredCategories.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No resources found matching "{searchTerm}"</p>
                </div>
            )}

            {/* Legend */}
            <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Bulk Actions</h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                        <CheckCheck className="w-4 h-4 text-green-600" />
                        <span>Grant All in category/row</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>Revoke All in category</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-2 py-0.5 text-xs rounded bg-blue-500 text-white">✓ View (3/5)</div>
                        <span>Toggle all of action type</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

