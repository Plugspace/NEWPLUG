'use client';

import { useState } from 'react';
import { X, User, Palette, Globe, Bell, Shield, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  onClose: () => void;
}

const settingsSections = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'appearance', name: 'Appearance', icon: Palette },
  { id: 'domains', name: 'Domains', icon: Globe },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'billing', name: 'Billing', icon: CreditCard },
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-surface rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-56 border-r border-surface-light p-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-4 px-2">Settings</h2>
          <div className="space-y-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors',
                  activeSection === section.id
                    ? 'bg-primary-700/20 text-primary-500'
                    : 'text-gray-400 hover:text-white hover:bg-surface-light'
                )}
              >
                <section.icon className="w-5 h-5" />
                <span className="text-sm">{section.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-surface-light">
            <h3 className="text-lg font-medium text-white">
              {settingsSections.find((s) => s.id === activeSection)?.name}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-light rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeSection === 'profile' && <ProfileSettings />}
            {activeSection === 'appearance' && <AppearanceSettings />}
            {activeSection === 'notifications' && <NotificationSettings />}
            {activeSection === 'security' && <SecuritySettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="w-20 h-20 bg-surface-light rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-gray-400" />
        </div>
        <button className="px-4 py-2 bg-surface-light hover:bg-surface-light/80 text-white rounded-lg text-sm transition-colors">
          Change Avatar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">First Name</label>
          <input
            type="text"
            defaultValue="John"
            className="w-full bg-background border border-surface-light rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-700"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Last Name</label>
          <input
            type="text"
            defaultValue="Doe"
            className="w-full bg-background border border-surface-light rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-700"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">Email</label>
        <input
          type="email"
          defaultValue="john@example.com"
          className="w-full bg-background border border-surface-light rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-700"
        />
      </div>

      <button className="px-4 py-2 bg-primary-700 hover:bg-primary-600 text-white rounded-lg transition-colors">
        Save Changes
      </button>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-white font-medium mb-3">Theme</h4>
        <div className="flex space-x-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" name="theme" defaultChecked className="accent-primary-700" />
            <span className="text-gray-300">Dark</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" name="theme" className="accent-primary-700" />
            <span className="text-gray-300">Light</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" name="theme" className="accent-primary-700" />
            <span className="text-gray-300">System</span>
          </label>
        </div>
      </div>

      <div>
        <h4 className="text-white font-medium mb-3">Canvas Grid</h4>
        <label className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer">
          <span className="text-gray-300">Show grid lines</span>
          <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary-700" />
        </label>
      </div>

      <div>
        <h4 className="text-white font-medium mb-3">Zoom Level</h4>
        <input
          type="range"
          min="50"
          max="200"
          defaultValue="100"
          className="w-full accent-primary-700"
        />
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
        <div>
          <span className="text-white">Email notifications</span>
          <p className="text-sm text-gray-500">Receive updates about your projects</p>
        </div>
        <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary-700" />
      </label>

      <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
        <div>
          <span className="text-white">Marketing emails</span>
          <p className="text-sm text-gray-500">News about features and promotions</p>
        </div>
        <input type="checkbox" className="w-5 h-5 accent-primary-700" />
      </label>

      <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
        <div>
          <span className="text-white">Push notifications</span>
          <p className="text-sm text-gray-500">Browser push notifications</p>
        </div>
        <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary-700" />
      </label>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-white font-medium mb-3">Password</h4>
        <button className="px-4 py-2 bg-surface-light hover:bg-surface-light/80 text-white rounded-lg text-sm transition-colors">
          Change Password
        </button>
      </div>

      <div>
        <h4 className="text-white font-medium mb-3">Two-Factor Authentication</h4>
        <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
          <div>
            <span className="text-white">Enable 2FA</span>
            <p className="text-sm text-gray-500">Add an extra layer of security</p>
          </div>
          <input type="checkbox" className="w-5 h-5 accent-primary-700" />
        </label>
      </div>

      <div>
        <h4 className="text-white font-medium mb-3">Sessions</h4>
        <button className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors">
          Sign out all devices
        </button>
      </div>
    </div>
  );
}
