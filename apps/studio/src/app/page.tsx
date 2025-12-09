'use client';

import { useState } from 'react';
import { Navbar } from '@/components/studio/navbar';
import { Sidebar } from '@/components/studio/sidebar';
import { Canvas } from '@/components/studio/canvas';
import { PublishButton } from '@/components/studio/publish-button';
import { PublishWizard } from '@/components/studio/publish-wizard';
import { MySitesModal } from '@/components/studio/my-sites-modal';
import { LibraryModal } from '@/components/studio/library-modal';
import { SettingsModal } from '@/components/studio/settings-modal';
import { useStudioStore } from '@/stores/studio-store';

export default function StudioPage() {
  const { 
    showPublishWizard, 
    showMySites, 
    showLibrary,
    showSettings,
    setShowMySites,
    setShowLibrary,
    setShowSettings,
    setShowPublishWizard,
  } = useStudioStore();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar 
        onOpenMySites={() => setShowMySites(true)}
        onOpenSettings={() => setShowSettings(true)}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenLibrary={() => setShowLibrary(true)} />
        <Canvas />
      </div>

      <PublishButton onClick={() => setShowPublishWizard(true)} />

      {/* Modals */}
      {showPublishWizard && (
        <PublishWizard onClose={() => setShowPublishWizard(false)} />
      )}
      {showMySites && (
        <MySitesModal onClose={() => setShowMySites(false)} />
      )}
      {showLibrary && (
        <LibraryModal onClose={() => setShowLibrary(false)} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
