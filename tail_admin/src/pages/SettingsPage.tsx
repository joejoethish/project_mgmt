import React, { useState } from 'react';
import { Settings, Save, RotateCcw, Building, Mail, FileText, Palette } from 'lucide-react';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import { useAppSettings } from '../context/AppSettingsContext';

const SettingsPage: React.FC = () => {
    const { settings, updateSettings, resetSettings } = useAppSettings();
    const [formData, setFormData] = useState(settings);
    const [saved, setSaved] = useState(false);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        updateSettings(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleReset = () => {
        if (confirm('Reset all settings to default values?')) {
            resetSettings();
            setFormData({
                appName: 'ProjectHub',
                appTagline: 'Project Management & Gamification Platform',
                companyName: 'Your Company',
                supportEmail: 'support@example.com',
                logoUrl: '',
            });
        }
    };

    return (
        <>
            <PageBreadcrumb pageTitle="Settings" />
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Settings */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Branding */}
                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/30">
                                <Building className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Branding</h2>
                                <p className="text-sm text-gray-500">Configure your app identity</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    App Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.appName}
                                    onChange={(e) => handleChange('appName', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    placeholder="Your App Name"
                                />
                                <p className="mt-1 text-xs text-gray-500">Displayed in header, sidebar, and browser tab</p>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Tagline
                                </label>
                                <input
                                    type="text"
                                    value={formData.appTagline}
                                    onChange={(e) => handleChange('appTagline', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    placeholder="Short description of your app"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => handleChange('companyName', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    placeholder="Your Company Inc."
                                />
                                <p className="mt-1 text-xs text-gray-500">Used in footer and copyright notices</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contact</h2>
                                <p className="text-sm text-gray-500">Support and contact information</p>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Support Email
                            </label>
                            <input
                                type="email"
                                value={formData.supportEmail}
                                onChange={(e) => handleChange('supportEmail', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                placeholder="support@example.com"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700"
                        >
                            <Save className="h-4 w-4" />
                            {saved ? 'Saved!' : 'Save Changes'}
                        </button>
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset to Default
                        </button>
                    </div>
                </div>

                {/* Preview Sidebar */}
                <div className="space-y-6">
                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/30">
                                <Palette className="h-5 w-5" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preview</h2>
                        </div>

                        {/* Mini Preview */}
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                            {/* Header Preview */}
                            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-700">
                                <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-xs font-bold text-white">
                                    {formData.appName.charAt(0)}
                                </div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{formData.appName}</span>
                            </div>
                            
                            {/* Content Preview */}
                            <div className="p-3">
                                <p className="text-xs text-gray-600 dark:text-gray-400">{formData.appTagline}</p>
                            </div>

                            {/* Footer Preview */}
                            <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-700">
                                <p className="text-xs text-gray-500">© 2024 {formData.companyName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white">
                        <div className="mb-3 flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            <h3 className="font-semibold">How it works</h3>
                        </div>
                        <ul className="space-y-2 text-sm text-white/90">
                            <li>• Settings are saved in browser</li>
                            <li>• Changes apply immediately</li>
                            <li>• Persists across sessions</li>
                            <li>• Affects header, sidebar, pages</li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsPage;

