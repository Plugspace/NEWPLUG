'use client';

import { useState } from 'react';
import { AlertTriangle, Power, Shield, Globe, Mail, Database, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('System is under maintenance. Please try again later.');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <p className="text-gray-400">Configure platform-wide settings</p>
      </div>

      {/* Kill Switch */}
      <div className="kill-switch rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Power className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Kill Switch</h3>
              <p className="text-sm text-gray-400 mt-1">
                Enable maintenance mode to temporarily disable all user access
              </p>
            </div>
          </div>
          <button
            onClick={() => setKillSwitchEnabled(!killSwitchEnabled)}
            className={cn(
              'toggle-switch',
              killSwitchEnabled && 'active bg-red-500'
            )}
          />
        </div>
        
        {killSwitchEnabled && (
          <div className="mt-4 pt-4 border-t border-red-500/20">
            <label className="block text-sm text-gray-400 mb-2">Maintenance Message</label>
            <textarea
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              rows={3}
              className="w-full bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
            <div className="flex items-center mt-3 text-sm text-yellow-500">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Warning: All users will be logged out when kill switch is enabled
            </div>
          </div>
        )}
      </div>

      {/* Feature Flags */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Feature Flags</h3>
        <div className="space-y-4">
          {[
            { id: 'voice', label: 'Voice Commands', description: 'Enable voice-first interaction', enabled: true },
            { id: 'ai', label: 'AI Agents', description: 'Enable AI-powered code generation', enabled: true },
            { id: 'multitenant', label: 'Multi-Tenant', description: 'Enable organization isolation', enabled: true },
            { id: 'domains', label: 'Custom Domains', description: 'Allow custom domain connections', enabled: true },
            { id: 'analytics', label: 'Analytics', description: 'Enable usage analytics tracking', enabled: false },
          ].map((flag) => (
            <div key={flag.id} className="flex items-center justify-between p-4 bg-surface-solid rounded-lg">
              <div>
                <h4 className="font-medium text-white">{flag.label}</h4>
                <p className="text-sm text-gray-500">{flag.description}</p>
              </div>
              <button className={cn('toggle-switch', flag.enabled && 'active')} />
            </div>
          ))}
        </div>
      </div>

      {/* API Settings */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Rate Limit (req/min)</label>
            <input
              type="number"
              defaultValue={100}
              className="w-full bg-surface-solid border border-surface-light rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Max Request Size (MB)</label>
            <input
              type="number"
              defaultValue={50}
              className="w-full bg-surface-solid border border-surface-light rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-700"
            />
          </div>
        </div>
      </div>

      {/* Email Settings */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Email Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">SMTP Host</label>
            <input
              type="text"
              placeholder="smtp.example.com"
              className="w-full bg-surface-solid border border-surface-light rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">SMTP Port</label>
              <input
                type="number"
                defaultValue={587}
                className="w-full bg-surface-solid border border-surface-light rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-700"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">From Email</label>
              <input
                type="email"
                placeholder="noreply@plugspace.io"
                className="w-full bg-surface-solid border border-surface-light rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-2 bg-primary-700 hover:bg-primary-600 text-white rounded-lg transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  );
}
