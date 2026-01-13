import React, { useState, useEffect } from 'react';
import { User, Mail, Briefcase, Phone, MapPin, Save, Camera } from 'lucide-react';
import PageBreadcrumb from '../components/common/PageBreadCrumb';

interface UserProfile {
    name: string;
    email: string;
    role: string;
    phone: string;
    location: string;
    bio: string;
    avatar: string;
}

const STORAGE_KEY = 'user_profile';

const defaultProfile: UserProfile = {
    name: 'Unified User',
    email: 'user@example.com',
    role: 'Software Developer',
    phone: '+1 234 567 890',
    location: 'New York, USA',
    bio: 'Passionate developer focused on building great products.',
    avatar: '',
};

const EditProfilePage: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? { ...defaultProfile, ...JSON.parse(stored) } : defaultProfile;
        } catch {
            return defaultProfile;
        }
    });
    const [saved, setSaved] = useState(false);

    const handleChange = (field: keyof UserProfile, value: string) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <>
            <PageBreadcrumb pageTitle="Edit Profile" />
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                        <div className="text-center">
                            {/* Avatar */}
                            <div className="relative mx-auto w-24">
                                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl font-bold text-white shadow-lg">
                                    {initials}
                                </div>
                                <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-700">
                                    <Camera className="h-4 w-4" />
                                </button>
                            </div>
                            
                            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{profile.name}</h2>
                            <p className="text-sm text-gray-500">{profile.role}</p>
                            <div className="mt-2 flex items-center justify-center gap-1 text-sm text-gray-500">
                                <MapPin className="h-4 w-4" />
                                {profile.location}
                            </div>
                        </div>

                        <div className="mt-6 space-y-3 border-t border-gray-200 pt-6 dark:border-gray-700">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">{profile.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">{profile.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Briefcase className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">{profile.role}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Personal Info */}
                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/30">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h2>
                                <p className="text-sm text-gray-500">Update your personal details</p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={profile.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={profile.location}
                                    onChange={(e) => handleChange('location', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Professional Info */}
                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30">
                                <Briefcase className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Professional Info</h2>
                                <p className="text-sm text-gray-500">Your role and bio</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Job Title / Role
                                </label>
                                <input
                                    type="text"
                                    value={profile.role}
                                    onChange={(e) => handleChange('role', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Bio
                                </label>
                                <textarea
                                    rows={3}
                                    value={profile.bio}
                                    onChange={(e) => handleChange('bio', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    placeholder="Tell us about yourself..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700"
                        >
                            <Save className="h-4 w-4" />
                            {saved ? 'Saved!' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default EditProfilePage;

