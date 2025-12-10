'use client';

import { Shield, LayoutDashboard, Users, FolderKanban, BarChart3, CreditCard, ShieldCheck, Bot, Palette, Settings, FileText, LogOut, User } from 'lucide-react';

type ViewType = 'dashboard' | 'users' | 'projects' | 'analytics' | 'billing' | 'security' | 'ai' | 'theme' | 'settings' | 'logs';

interface AdminSidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const navigation: Array<{ id: ViewType; icon: any; label: string }> = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'users', icon: Users, label: 'Users' },
  { id: 'projects', icon: FolderKanban, label: 'Projects' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'billing', icon: CreditCard, label: 'Billing' },
  { id: 'security', icon: ShieldCheck, label: 'Security' },
  { id: 'ai', icon: Bot, label: 'AI Systems' },
  { id: 'theme', icon: Palette, label: 'Theme Studio' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'logs', icon: FileText, label: 'System Logs' },
];

export default function AdminSidebar({ activeView, onViewChange }: AdminSidebarProps) {
  return (
    <aside className="w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Admin Studio</h1>
            <p className="text-xs text-[#94a3b8]">System Control</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-[rgba(59,130,246,0.1)] text-white border-l-4 border-[#3b82f6]'
                  : 'text-[#94a3b8] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer - User */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
            SA
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Super Admin</p>
            <p className="text-xs text-[#94a3b8]">plugspaceapp@gmail.com</p>
          </div>
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[#94a3b8] hover:bg-white/5 hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}
