import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router"; // V6/V7 compat
import axios from "axios";
import toast from "react-hot-toast";
import AuthPageLayout from "./AuthPageLayout";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.1.26:8000/api/pm';

export default function AcceptInvite() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    
    const [verifying, setVerifying] = useState(true);
    const [valid, setValid] = useState(false);
    const [inviteData, setInviteData] = useState<{ email: string, first_name: string, role?: string } | null>(null);
    const [error, setError] = useState("");

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Missing invitation token.");
            setVerifying(false);
            return;
        }

        // Validate Token
        axios.get(`${API_BASE}/auth/invite/validate/?token=${token}`)
            .then(res => {
                setValid(true);
                setInviteData(res.data);
                // Pre-fill username possibility?
                setUsername(res.data.email.split('@')[0]);
            })
            .catch(err => {
                setError(err.response?.data?.error || "Invalid or expired invitation link.");
            })
            .finally(() => setVerifying(false));
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setSubmitting(true);
        try {
            await axios.post(`${API_BASE}/auth/invite/accept/`, {
                token,
                username,
                password
            });
            toast.success("Account created! Redirecting to login...");
            setTimeout(() => navigate("/login"), 2000);
        } catch (err: any) {
             toast.error(err.response?.data?.error || "Failed to accept invitation");
             setSubmitting(false);
        }
    };

    if (verifying) {
        return (
            <AuthPageLayout title="Verifying Invitation..." subtitle="Please wait">
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </AuthPageLayout>
        );
    }

    if (!valid || error) {
        return (
            <AuthPageLayout title="Invalid Invitation" subtitle="We couldn't verify your invitation">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                    {error}
                </div>
                <Button onClick={() => navigate("/login")} className="w-full">
                    Back to Login
                </Button>
            </AuthPageLayout>
        );
    }

    return (
        <AuthPageLayout>
            <div className="w-full max-w-sm">
                <h2 className="mb-9 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                    Welcome, {inviteData?.first_name}!
                </h2>
                <p className="mb-4 font-medium text-gray-500 dark:text-gray-400">
                    Set up your account for {inviteData?.email}
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <Label htmlFor="username">Username</Label>
                        <div className="relative">
                            <Input
                                id="username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                placeholder="Choose a username"
                            />
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                placeholder="Create a password"
                            />
                        </div>
                    </div>

                     <div className="mb-6">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Confirm password"
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? "Creating Account..." : "Create Account"}
                    </Button>
                </form>
            </div>
        </AuthPageLayout>
    );
}
