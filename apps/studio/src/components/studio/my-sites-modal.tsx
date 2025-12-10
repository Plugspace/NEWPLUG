'use client';

import { X, Plus, Globe, Clock, MoreVertical } from 'lucide-react';

interface MySitesModalProps {
  onClose: () => void;
}

const draftSites = [
  { id: '1', name: 'Fashion Store', updatedAt: '2 hours ago', thumbnail: 'https://picsum.photos/seed/1/300/200' },
  { id: '2', name: 'Portfolio Site', updatedAt: '1 day ago', thumbnail: 'https://picsum.photos/seed/2/300/200' },
];

const publishedSites = [
  { id: '3', name: 'Restaurant Landing', url: 'restaurant.projects.plugspace.io', thumbnail: 'https://picsum.photos/seed/3/300/200' },
  { id: '4', name: 'Tech Startup', url: 'startup.projects.plugspace.io', thumbnail: 'https://picsum.photos/seed/4/300/200' },
];

export function MySitesModal({ onClose }: MySitesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-surface rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-light">
          <h2 className="text-xl font-semibold text-white">My Sites</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-light rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Drafts Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center">
                <Clock className="w-5 h-5 mr-2 text-gray-400" />
                Unfinished Drafts
              </h3>
              <button className="flex items-center space-x-2 px-3 py-1.5 bg-primary-700 hover:bg-primary-600 text-white rounded-lg text-sm transition-colors">
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftSites.map((site) => (
                <div
                  key={site.id}
                  className="bg-background rounded-lg overflow-hidden border border-surface-light hover:border-primary-700/50 transition-colors cursor-pointer group"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={site.thumbnail}
                      alt={site.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 right-2">
                      <button className="p-1.5 bg-black/50 hover:bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-white">{site.name}</h4>
                    <p className="text-sm text-gray-500">Updated {site.updatedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Published Section */}
          <div>
            <h3 className="text-lg font-medium text-white flex items-center mb-4">
              <Globe className="w-5 h-5 mr-2 text-green-500" />
              Saved & Published
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedSites.map((site) => (
                <div
                  key={site.id}
                  className="bg-background rounded-lg overflow-hidden border border-surface-light hover:border-primary-700/50 transition-colors cursor-pointer group"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={site.thumbnail}
                      alt={site.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded-full">
                        Live
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <button className="p-1.5 bg-black/50 hover:bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-white">{site.name}</h4>
                    <p className="text-sm text-primary-500 truncate">{site.url}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
