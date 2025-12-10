'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/admin/sidebar';
import { Dashboard } from '@/components/admin/dashboard';
import { UsersPage } from '@/components/admin/users';
import { ProjectsPage } from '@/components/admin/projects';
import { ThemesPage } from '@/components/admin/themes';
import { SettingsPage } from '@/components/admin/settings';

type Page = 'dashboard' | 'users' | 'projects' | 'themes' | 'settings';

export default function AdminPage() {
  const [activePage, setActivePage] = useState<Page>('dashboard');

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      
      <main className="flex-1 overflow-y-auto p-6">
        {activePage === 'dashboard' && <Dashboard />}
        {activePage === 'users' && <UsersPage />}
        {activePage === 'projects' && <ProjectsPage />}
        {activePage === 'themes' && <ThemesPage />}
        {activePage === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
