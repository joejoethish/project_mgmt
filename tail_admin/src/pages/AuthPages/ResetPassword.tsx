import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useParams } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import AuthLayout from "./AuthPageLayout";
import PageMeta from "../../components/common/PageMeta";
import axios from "axios";
import toast from "react-hot-toast";

// Use environment variable or default
const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.1.26:8000/api/pm';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const { uid: routeUid, token: routeToken } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Support both query params (?uid=x&token=y) and path params (/x/y)
  const uid = searchParams.get("uid") || routeUid;
  const token = searchParams.get("token") || routeToken;

  useEffect(() => {
     console.log("ResetPassword Params:", { uid, token });
     if (!uid || !token) {
         // Don't redirect immediately so user can see what's wrong or if it's just loading
         // navigate("/signin");
         toast.error("Missing reset token. Please check the link.");
     }
  }, [uid, token]);

  if (!uid || !token) {
      return (
        <AuthLayout>
            <div className="flex flex-col items-center justify-center flex-1 w-full text-center">
                <h2 className="text-xl font-bold text-error-500">Invalid Link</h2>
                <p className="mt-2 text-gray-600">The password reset link is invalid or expired.</p>
                <p className="mt-1 text-sm text-gray-500">Missing UID or Token.</p>
                <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs break-all">
                    <p><strong>Debug Info:</strong></p>
                    <p>Current URL: {window.location.href}</p>
                    <p>Search Params: {searchParams.toString()}</p>
                </div>
                <Link to="/signin" className="mt-4 text-brand-500 hover:underline">Return to Sign In</Link>
            </div>
        </AuthLayout>
      )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/reset-password/`, { 
          uid, 
          token, 
          password 
      });
      toast.success("Password reset successful! Please login.");
      navigate("/signin");
    } catch (error) {
      console.error(error);
      toast.error("Failed to reset password. Link may be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Reset Password | TailAdmin"
        description="Set a new password"
      />
      <AuthLayout>
        <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
          <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
            <Link
              to="/signin"
              className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ChevronLeftIcon className="size-5" />
              Back to Sign In
            </Link>
          </div>
          <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
            <div className="mb-5 sm:mb-8">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Reset Password
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your new password below.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <Label>
                    New Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                
                <div>
                  <Label>
                    Confirm Password<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Button className="w-full" size="sm" disabled={loading}>
                    {loading ? "Resetting..." : "Set New Password"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </AuthLayout>
    </>
  );
}
