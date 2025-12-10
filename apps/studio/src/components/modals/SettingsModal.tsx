'use client';

import { Modal, ModalHeader, ModalBody, Toggle } from '@plugspace/ui';
import { Bot, Sliders, Users, CreditCard } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  return (
    <Modal open={true} onClose={onClose} size="xl">
      <ModalHeader>
        <h2 className="text-2xl font-bold text-white">Settings Dashboard</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex h-[600px]">
          {/* Sidebar */}
          <aside className="w-64 border-r border-slate-700 pr-4">
            <nav className="space-y-1">
              {[
                { id: 'ai', icon: Bot, label: 'AI Config', active: true },
                { id: 'general', icon: Sliders, label: 'General' },
                { id: 'team', icon: Users, label: 'Team Access' },
                { id: 'billing', icon: CreditCard, label: 'Billing' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      item.active
                        ? 'bg-[rgba(59,130,246,0.1)] text-white'
                        : 'text-[#94a3b8] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 pl-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">AI Configuration</h3>
                <div className="space-y-4">
                  {[
                    { name: 'AI Code Gen', model: 'Claude Opus 4.5', enabled: true },
                    { name: 'Smart Design', model: 'Gemini 3.0', enabled: true },
                    { name: 'Instant Deploy', model: 'Claude Opus 4.5', enabled: false },
                  ].map((agent) => (
                    <div
                      key={agent.name}
                      className="flex items-center justify-between p-4 bg-[#1e293b] rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium text-white">{agent.name}</h4>
                        <p className="text-sm text-[#94a3b8]">{agent.model}</p>
                      </div>
                      <Toggle
                        checked={agent.enabled}
                        onCheckedChange={() => {}}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
