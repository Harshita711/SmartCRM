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
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Data',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/orders', label: 'Orders', icon: ShoppingCart },
    ],
  },
  {
    title: 'Audience',
    items: [
      { to: '/segments', label: 'Segmentation', icon: Filter },
      { to: '/audience-builder', label: 'AI Audience Builder', icon: Sparkles },
    ],
  },
  {
    title: 'Campaigns',
    items: [
      { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
      { to: '/campaign-generator', label: 'AI Campaign Generator', icon: Wand2 },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'AI Tools',
    items: [{ to: '/agent', label: 'Marketing Agent', icon: Bot }],
  },
];

const Sidebar = () => {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-gray-100 dark:border-surface-darkBorder bg-white dark:bg-surface-darkCard h-screen sticky top-0 overflow-y-auto">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-gray-100 dark:border-surface-darkBorder">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-glow">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-display font-bold text-base leading-tight text-gray-900 dark:text-white">SmartCRM</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">AI-Native Engagement</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-surface-darkBorder'
                    }`
                  }
                >
                  <item.icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-surface-darkBorder">
        <div className="rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 p-4 text-white">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> AI Copilot
          </p>
          <p className="text-xs text-brand-100 mt-1">Ask the copilot to build segments, draft copy, or plan campaigns.</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
