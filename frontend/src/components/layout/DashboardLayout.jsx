import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import AICopilotSidebar from './AICopilotSidebar.jsx';
import MobileSidebar from './MobileSidebar.jsx';

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-subtle dark:bg-surface-dark">
      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="px-4 lg:px-8 py-6 pb-28 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
      <AICopilotSidebar />
    </div>
  );
};

export default DashboardLayout;
