import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated, user, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !user) {
             navigate("/auth/signin");
        }
    }, [user, isLoading, navigate]);

    if (isLoading) {
        // Render a simple loading spinner or blank screen
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="border-gray-300 h-10 w-10 animate-spin rounded-full border-4 border-t-blue-600" />
            </div>
        );
    }

    if (!user) {
        return null; 
    }

    return <>{children}</>;
}

