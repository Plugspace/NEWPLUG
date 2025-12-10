'use client';

import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import DashboardView from './views/DashboardView';
import UsersView from './views/UsersView';
import ThemeStudioView from './views/ThemeStudioView';
import AnalyticsView from './views/AnalyticsView';
import SettingsView from './views/SettingsView';
import SystemLogsView from './views/SystemLogsView';

type ViewType = 'dashboard' | 'users' | 'projects' | 'analytics' | 'billing' | 'security' | 'ai' | 'theme' | 'settings' | 'logs';

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'users':
        return <UsersView />;
      case 'theme':
        return <ThemeStudioView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      case 'logs':
        return <SystemLogsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0B1120] text-[#e2e8f0]">
      <AdminSidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
