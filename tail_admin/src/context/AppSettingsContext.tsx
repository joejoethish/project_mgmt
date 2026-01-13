import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AppSettings {
    appName: string;
    appTagline: string;
    companyName: string;
    supportEmail: string;
    logoUrl: string;
}

const defaultSettings: AppSettings = {
    appName: 'ProjectHub',
    appTagline: 'Project Management & Gamification Platform',
    companyName: 'Your Company',
    supportEmail: 'support@example.com',
    logoUrl: '',
};

interface AppSettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    resetSettings: () => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'app_settings';

export const AppSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
        } catch {
            return defaultSettings;
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        // Update document title
        document.title = settings.appName;
    }, [settings]);

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <AppSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
            {children}
        </AppSettingsContext.Provider>
    );
};

export const useAppSettings = () => {
    const context = useContext(AppSettingsContext);
    if (!context) {
        throw new Error('useAppSettings must be used within AppSettingsProvider');
    }
    return context;
};

export default AppSettingsContext;

