'use client';

import { ArrowLeft, Monitor, Tablet, Smartphone, Save, Undo2, Redo2, Settings, Upload, User } from 'lucide-react';
import { Button } from '@plugspace/ui';

interface StudioNavProps {
  device: 'desktop' | 'tablet' | 'mobile';
  onDeviceChange: (device: 'desktop' | 'tablet' | 'mobile') => void;
  onMySitesClick: () => void;
  onPublishClick: () => void;
  onSettingsClick: () => void;
}

export default function StudioNav({
  device,
  onDeviceChange,
  onMySitesClick,
  onPublishClick,
  onSettingsClick,
}: StudioNavProps) {
  return (
    <nav className="h-14 bg-[#0B1120] border-b border-slate-800 flex items-center justify-between px-6">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-white/5 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-[#94a3b8]" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">Plug</span>
          <span className="text-lg font-bold text-[#8b5cf6]">space</span>
        </div>
        <div className="px-3 py-1 bg-[#1e293b] rounded text-sm text-[#94a3b8]">
          Project #1234
        </div>
      </div>

      {/* Center - Device Toggles */}
      <div className="flex items-center gap-2 bg-[#1e293b] rounded-lg p-1">
        <button
          onClick={() => onDeviceChange('desktop')}
          className={`p-2 rounded transition-colors ${
            device === 'desktop' ? 'bg-[#8b5cf6] text-white' : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <Monitor className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDeviceChange('tablet')}
          className={`p-2 rounded transition-colors ${
            device === 'tablet' ? 'bg-[#8b5cf6] text-white' : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <Tablet className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDeviceChange('mobile')}
          className={`p-2 rounded transition-colors ${
            device === 'mobile' ? 'bg-[#8b5cf6] text-white' : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4" />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-green-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Saved</span>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-lg">
          <Undo2 className="w-5 h-5 text-[#94a3b8]" />
        </button>
        <button className="p-2 hover:bg-white/5 rounded-lg">
          <Redo2 className="w-5 h-5 text-[#94a3b8]" />
        </button>
        <button onClick={onSettingsClick} className="p-2 hover:bg-white/5 rounded-lg">
          <Settings className="w-5 h-5 text-[#94a3b8]" />
        </button>
        <Button variant="indigo" onClick={onPublishClick}>
          <Upload className="w-4 h-4 mr-2" />
          Publish
        </Button>
        <button onClick={onMySitesClick} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
          <User className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
