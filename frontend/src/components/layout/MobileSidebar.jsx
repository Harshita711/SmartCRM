import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Filter,
  Sparkles,
  Megaphone,
  Wand2,
  BarChart3,
  Bot,
  Zap,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/segments', label: 'Segmentation', icon: Filter },
  { to: '/audience-builder', label: 'AI Audience Builder', icon: Sparkles },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/campaign-generator', label: 'AI Campaign Generator', icon: Wand2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/agent', label: 'Marketing Agent', icon: Bot },
];

const MobileSidebar = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-72 h-full bg-white dark:bg-surface-darkCard overflow-y-auto animate-slide-up">
        <div className="px-5 py-5 flex items-center justify-between border-b border-gray-100 dark:border-surface-darkBorder">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <p className="font-display font-bold text-base text-gray-900 dark:text-white">SmartCRM</p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-surface-darkBorder'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default MobileSidebar;
