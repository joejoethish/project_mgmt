import { useAppSettings } from '../context/AppSettingsContext';

export default function Footer() {
  const { settings } = useAppSettings();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="shrink-0 py-3 px-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div>
          © {currentYear} <span className="font-medium text-gray-700 dark:text-gray-300">{settings.companyName || 'Your Company'}</span>. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">Privacy</a>
          <a href="#" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">Terms</a>
          <span className="text-gray-400">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}

