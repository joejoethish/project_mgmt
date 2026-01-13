import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// Use environment variable or default
const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.1.26:8000/api/pm';

interface User {
    member_id: string;
    first_name: string;
    last_name: string;
    email: string;
    role?: string;
    permissions?: string[];
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: any) => Promise<any>;
    logout: () => void;
    hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check localStorage for existing session/token
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        
        // Refresh profile from server to get latest permissions
        refreshUser();
        
        setIsLoading(false);
    }, []);

    const refreshUser = async () => {
        try {
            const res = await axios.get(`${API_BASE}/auth/me/`, { withCredentials: true });
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
        } catch (error) {
            // If 401, clear session
            console.log("Session refresh failed", error);
            // Optional: logout() if strictly enforcing session validity
        }
    };

    const login = async (credentials: any) => {
        try {
            // Ensure cookies are sent/received
            const res = await axios.post(`${API_BASE}/auth/login/`, credentials, {
                withCredentials: true
            });
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
            return res.data;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const hasPermission = (perm: string) => {
        if (!user || !user.permissions) return false;
        return user.permissions.includes(perm);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

