'use client';

import { useState } from 'react';
import { Sparkles, Globe, Image as ImageIcon, Code, Library, Palette } from 'lucide-react';
import { Button, Input, Toggle } from '@plugspace/ui';

type TabType = 'create' | 'clone' | 'image' | 'html' | 'library';

export default function ThemeStudioView() {
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [themeName, setThemeName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [style, setStyle] = useState('');

  const tabs = [
    { id: 'create' as TabType, icon: Sparkles, label: 'Create' },
    { id: 'clone' as TabType, icon: Globe, label: 'Clone' },
    { id: 'image' as TabType, icon: ImageIcon, label: 'Image' },
    { id: 'html' as TabType, icon: Code, label: 'HTML' },
    { id: 'library' as TabType, icon: Library, label: 'Library' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Theme Studio</h1>
        <p className="text-[#94a3b8] mt-1">Generate and manage design themes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-white'
                  : 'border-transparent text-[#94a3b8] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="glass rounded-xl p-6">
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Theme Name</label>
              <Input
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="Enter theme name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your theme..."
                className="w-full px-3 py-2 bg-[#111] border border-[#27272a] rounded-lg text-white placeholder:text-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Industry</label>
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Fashion, Tech"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Style</label>
                <Input
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="e.g. Modern, Minimal"
                />
              </div>
            </div>
            <Button variant="gradient" className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Theme with AI
            </Button>
          </div>
        )}

        {activeTab === 'clone' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Website URL</label>
              <Input placeholder="https://example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Theme Name</label>
              <Input placeholder="Enter theme name" />
            </div>
            <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-4">
              <p className="text-sm text-yellow-400">
                ⚠️ Secure proxy will be used to fetch the website
              </p>
            </div>
            <Toggle
              checked={true}
              onCheckedChange={() => {}}
              label="Include JavaScript"
            />
            <Button variant="indigo" className="w-full">
              <Globe className="w-4 h-4 mr-2" />
              Clone Website
            </Button>
          </div>
        )}

        {activeTab === 'image' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-12 text-center">
              <ImageIcon className="w-12 h-12 text-[#94a3b8] mx-auto mb-4" />
              <p className="text-white mb-2">Drop image here or click to upload</p>
              <p className="text-sm text-[#94a3b8]">PNG, JPG, WEBP up to 10MB</p>
            </div>
            <Button variant="gradient" className="w-full">
              Analyze & Generate Theme
            </Button>
          </div>
        )}

        {activeTab === 'html' && (
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-slate-700">
              <button className="px-4 py-2 border-b-2 border-blue-600 text-white">Paste Code</button>
              <button className="px-4 py-2 text-[#94a3b8]">Upload File</button>
            </div>
            <textarea
              placeholder="Paste your HTML code here..."
              className="w-full h-64 px-3 py-2 bg-[#111] border border-[#27272a] rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
            />
            <Button variant="indigo" className="w-full">
              <Code className="w-4 h-4 mr-2" />
              Extract Theme
            </Button>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg p-4 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                >
                  <Palette className="w-8 h-8 text-white" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
