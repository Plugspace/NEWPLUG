'use client';

import { useState } from 'react';
import StudioNav from './StudioNav';
import StudioSidebar from './StudioSidebar';
import StudioCanvas from './StudioCanvas';
import MySitesModal from './modals/MySitesModal';
import PublishWizardModal from './modals/PublishWizardModal';
import LibraryModal from './modals/LibraryModal';
import SettingsModal from './modals/SettingsModal';

interface StudioInterfaceProps {
  projectId: string;
}

export default function StudioInterface({ projectId }: StudioInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'library' | 'adopt' | 'zara'>('chat');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showMySites, setShowMySites] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-[#0B1120] text-white">
      <StudioNav
        device={device}
        onDeviceChange={setDevice}
        onMySitesClick={() => setShowMySites(true)}
        onPublishClick={() => setShowPublish(true)}
        onSettingsClick={() => setShowSettings(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <StudioSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLibraryClick={() => setShowLibrary(true)}
        />
        <StudioCanvas device={device} />
      </div>

      {/* Modals */}
      {showMySites && <MySitesModal onClose={() => setShowMySites(false)} />}
      {showPublish && <PublishWizardModal onClose={() => setShowPublish(false)} />}
      {showLibrary && <LibraryModal onClose={() => setShowLibrary(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
