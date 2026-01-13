import { useAppSettings } from "../context/AppSettingsContext";
import { Mail, Settings } from "lucide-react";
import { Link } from "react-router";

export default function SidebarWidget() {
  const { settings } = useAppSettings();

  return (
    <div
      className={`
        mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]`}
    >
      <div className="mb-3 flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <Settings className="h-5 w-5" />
      </div>
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
        {settings.appName}
      </h3>
      <p className="mb-4 text-gray-500 text-theme-sm dark:text-gray-400">
        {settings.appTagline}
      </p>
      <Link
        to="/settings"
        className="flex items-center justify-center gap-2 p-3 font-medium text-white rounded-lg bg-brand-500 text-theme-sm hover:bg-brand-600"
      >
        <Settings className="h-4 w-4" />
        App Settings
      </Link>
    </div>
  );
}

