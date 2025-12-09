'use client';

import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  Undo2, 
  Redo2, 
  Save, 
  FolderOpen,
  Settings,
  Eye,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { useStudioStore } from '@/stores/studio-store';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onOpenMySites: () => void;
  onOpenSettings: () => void;
}

export function Navbar({ onOpenMySites, onOpenSettings }: NavbarProps) {
  const {
    projectName,
    device,
    isDirty,
    lastSaved,
    setDevice,
    undo,
    redo,
    history,
    historyIndex,
  } = useStudioStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const devices = [
    { id: 'desktop', icon: Monitor, label: 'Desktop' },
    { id: 'tablet', icon: Tablet, label: 'Tablet' },
    { id: 'mobile', icon: Smartphone, label: 'Mobile' },
  ] as const;

  return (
    <nav className="h-14 bg-surface border-b border-surface-light flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Logo */}
        <div className="font-bold text-lg">
          <span className="text-white">Plug</span>
          <span className="text-primary-700">space</span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-surface-light" />

        {/* Project Name */}
        <button
          onClick={onOpenMySites}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-surface-light transition-colors"
        >
          <FolderOpen className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium truncate max-w-[200px]">
            {projectName}
          </span>
          {isDirty && <span className="text-primary-500">•</span>}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {/* Save Status */}
        <div className="text-xs text-gray-500">
          {isDirty ? (
            <span className="flex items-center">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Unsaved changes
            </span>
          ) : lastSaved ? (
            `Saved ${lastSaved.toLocaleTimeString()}`
          ) : (
            'Not saved'
          )}
        </div>
      </div>

      {/* Center Section - Device Toggles */}
      <div className="flex items-center space-x-1 bg-background rounded-lg p-1">
        {devices.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setDevice(id)}
            className={cn(
              'p-2 rounded-md transition-colors',
              device === id
                ? 'bg-primary-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-surface-light'
            )}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-2">
        {/* Undo/Redo */}
        <div className="flex items-center space-x-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={cn(
              'p-2 rounded-lg transition-colors',
              canUndo
                ? 'text-gray-400 hover:text-white hover:bg-surface-light'
                : 'text-gray-600 cursor-not-allowed'
            )}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={cn(
              'p-2 rounded-lg transition-colors',
              canRedo
                ? 'text-gray-400 hover:text-white hover:bg-surface-light'
                : 'text-gray-600 cursor-not-allowed'
            )}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-surface-light" />

        {/* Preview */}
        <button
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-light transition-colors"
          title="Preview"
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm">Preview</span>
        </button>

        {/* Save */}
        <button
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-light transition-colors"
          title="Save (Ctrl+S)"
        >
          <Save className="w-4 h-4" />
          <span className="text-sm">Save</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-light transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
