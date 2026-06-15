import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon, LogOut, ChevronDown, Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/customers': 'Customer Management',
  '/orders': 'Order Management',
  '/segments': 'Audience Segmentation',
  '/audience-builder': 'AI Audience Builder',
  '/campaigns': 'Campaigns',
  '/campaign-generator': 'AI Campaign Generator',
  '/analytics': 'Campaign Analytics',
  '/agent': 'AI Marketing Agent',
};

const Topbar = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Resolve title: exact match first, then check if path starts with a known prefix (e.g. /customers/:id)
  const title =
    PAGE_TITLES[location.pathname] ||
    Object.entries(PAGE_TITLES).find(([key]) => key !== '/' && location.pathname.startsWith(key))?.[1] ||
    'SmartCRM';

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-surface-darkCard/80 backdrop-blur-md border-b border-gray-100 dark:border-surface-darkBorder px-4 lg:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden btn-ghost px-2">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-display font-semibold text-lg text-gray-900 dark:text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-darkBorder transition"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-surface-darkBorder transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-400 leading-tight">{user?.company}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 card p-1.5 z-40 animate-fade-in">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
