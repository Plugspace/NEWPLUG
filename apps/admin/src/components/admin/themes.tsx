'use client';

import { useState } from 'react';
import { Wand2, Globe, Image, Code, Library, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'create', label: 'Create', icon: Wand2 },
  { id: 'clone', label: 'Clone', icon: Globe },
  { id: 'image', label: 'Image', icon: Image },
  { id: 'html', label: 'HTML', icon: Code },
  { id: 'library', label: 'Library', icon: Library },
];

export function ThemesPage() {
  const [activeTab, setActiveTab] = useState('create');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Theme Studio</h1>
          <p className="text-gray-400">Create and manage design themes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex border-b border-surface-light">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center space-x-2 px-6 py-4 transition-colors relative',
                activeTab === tab.id
                  ? 'text-primary-500 bg-primary-700/10'
                  : 'text-gray-400 hover:text-white hover:bg-surface-light/50'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'create' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Theme Name</label>
                <input
                  type="text"
                  placeholder="My Awesome Theme"
                  className="w-full bg-surface-solid border border-surface-light rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-700"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Description</label>
                <textarea
                  placeholder="Describe the look and feel you want..."
                  rows={4}
                  className="w-full bg-surface-solid border border-surface-light rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-700 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Industry</label>
                  <select className="w-full bg-surface-solid border border-surface-light rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-700">
                    <option>Technology</option>
                    <option>Fashion</option>
                    <option>Food & Beverage</option>
                    <option>Healthcare</option>
                    <option>Education</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Style</label>
                  <select className="w-full bg-surface-solid border border-surface-light rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-700">
                    <option>Modern</option>
                    <option>Minimal</option>
                    <option>Bold</option>
                    <option>Elegant</option>
                    <option>Playful</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-primary-700 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>Generate Theme</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'clone' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Website URL</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  className="w-full bg-surface-solid border border-surface-light rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-700"
                />
              </div>
              <p className="text-sm text-gray-500">
                Enter a website URL to analyze and extract its design system. Sherlock AI will scrape the site and generate a matching theme.
              </p>
              <button className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-primary-700 hover:bg-primary-600 text-white rounded-lg transition-colors">
                <Globe className="w-5 h-5" />
                <span>Analyze Website</span>
              </button>
            </div>
          )}

          {activeTab === 'image' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-surface-light rounded-xl p-12 text-center hover:border-primary-700 transition-colors cursor-pointer">
                <Image className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Drop an image or screenshot here</p>
                <p className="text-sm text-gray-500 mt-2">Supports PNG, JPG, WebP</p>
              </div>
              <p className="text-sm text-gray-500">
                Upload a screenshot or design mockup, and our AI will extract colors, typography, and styling to create a matching theme.
              </p>
              <button className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-primary-700 hover:bg-primary-600 text-white rounded-lg transition-colors">
                <Image className="w-5 h-5" />
                <span>Analyze Image</span>
              </button>
            </div>
          )}

          {activeTab === 'html' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Paste HTML/CSS</label>
                <textarea
                  placeholder="Paste your HTML or CSS code here..."
                  rows={10}
                  className="w-full bg-surface-solid border border-surface-light rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-700 font-mono text-sm resize-none"
                />
              </div>
              <button className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-primary-700 hover:bg-primary-600 text-white rounded-lg transition-colors">
                <Code className="w-5 h-5" />
                <span>Extract Theme</span>
              </button>
            </div>
          )}

          {activeTab === 'library' && (
            <div className="space-y-6">
              <p className="text-gray-400">Browse and manage saved themes</p>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-surface-solid rounded-lg overflow-hidden hover:ring-2 ring-primary-700 cursor-pointer transition-all">
                    <div className="aspect-video bg-gradient-to-br from-primary-700/20 to-pink-500/20" />
                    <div className="p-3">
                      <h4 className="font-medium text-white">Theme {i}</h4>
                      <p className="text-xs text-gray-500">Modern • Technology</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
