'use client';

import { MessageSquare, Library, Globe, Zap } from 'lucide-react';
import ChatTab from './tabs/ChatTab';
import LibraryTab from './tabs/LibraryTab';
import AdoptTab from './tabs/AdoptTab';
import ZaraTab from './tabs/ZaraTab';

interface StudioSidebarProps {
  activeTab: 'chat' | 'library' | 'adopt' | 'zara';
  onTabChange: (tab: 'chat' | 'library' | 'adopt' | 'zara') => void;
  onLibraryClick: () => void;
}

export default function StudioSidebar({ activeTab, onTabChange, onLibraryClick }: StudioSidebarProps) {
  const tabs = [
    { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
    { id: 'library' as const, icon: Library, label: 'Library' },
    { id: 'adopt' as const, icon: Globe, label: 'Adopt' },
    { id: 'zara' as const, icon: Zap, label: 'Zara', indicator: true },
  ];

  return (
    <aside className="w-80 bg-[#0F172A] border-r border-slate-800 flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#8b5cf6] text-white'
                  : 'border-transparent text-[#94a3b8] hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.indicator && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#8b5cf6] rounded-full" />
                )}
              </div>
              <span className="text-xs">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'chat' && <ChatTab />}
        {activeTab === 'library' && <LibraryTab onFullLibraryClick={onLibraryClick} />}
        {activeTab === 'adopt' && <AdoptTab />}
        {activeTab === 'zara' && <ZaraTab />}
      </div>
    </aside>
  );
}
