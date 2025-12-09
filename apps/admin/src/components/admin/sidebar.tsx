'use client';

import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  Palette, 
  Settings,
  LogOut,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: 'dashboard' | 'users' | 'projects' | 'themes' | 'settings') => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'themes', label: 'Theme Studio', icon: Palette },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-16 hover:w-64 transition-all duration-300 bg-surface-solid border-r border-surface-light flex flex-col group">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-surface-light overflow-hidden">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <span className="ml-3 font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'w-full flex items-center px-4 py-3 text-left transition-colors',
              activePage === item.id
                ? 'nav-active text-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-surface-light'
            )}
          >
            <item.icon className="w-6 h-6 flex-shrink-0" />
            <span className="ml-3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-surface-light py-4">
        <button className="w-full flex items-center px-4 py-3 text-gray-400 hover:text-red-400 transition-colors">
          <LogOut className="w-6 h-6 flex-shrink-0" />
          <span className="ml-3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
