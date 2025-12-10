'use client';

import { useState } from 'react';
import { Search, Filter, ExternalLink, Trash2, MoreVertical, Globe, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const mockProjects = [
  { id: '1', name: 'Fashion Store', subdomain: 'fashion-store', owner: 'john@example.com', status: 'PUBLISHED', views: 12500, createdAt: '2024-01-10' },
  { id: '2', name: 'Tech Startup', subdomain: 'tech-startup', owner: 'jane@example.com', status: 'PUBLISHED', views: 8900, createdAt: '2024-01-08' },
  { id: '3', name: 'Portfolio', subdomain: 'my-portfolio', owner: 'bob@example.com', status: 'DRAFT', views: 0, createdAt: '2024-01-12' },
  { id: '4', name: 'Restaurant', subdomain: 'tasty-bites', owner: 'alice@example.com', status: 'PUBLISHED', views: 5600, createdAt: '2024-01-05' },
  { id: '5', name: 'Blog', subdomain: 'dev-blog', owner: 'charlie@example.com', status: 'ARCHIVED', views: 2300, createdAt: '2023-12-20' },
];

export function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = mockProjects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400">Manage all platform projects</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-solid border border-surface-light rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary-700"
          />
        </div>
        <button className="flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-white transition-colors">
          <Filter className="w-4 h-4" />
          <span>Status</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => (
          <div key={project.id} className="glass rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-video bg-gradient-to-br from-surface-light to-surface-solid flex items-center justify-center">
              <Globe className="w-12 h-12 text-gray-600" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white">{project.name}</h3>
                <span className={cn(
                  'px-2 py-0.5 text-xs rounded-full',
                  project.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-400' :
                  project.status === 'ARCHIVED' ? 'bg-gray-500/20 text-gray-400' :
                  'bg-yellow-500/20 text-yellow-400'
                )}>
                  {project.status}
                </span>
              </div>
              <p className="text-sm text-primary-500 mb-3">{project.subdomain}.projects.plugspace.io</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{project.owner}</span>
                <span>{project.views.toLocaleString()} views</span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-light">
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {project.createdAt}
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-1.5 hover:bg-surface-light rounded transition-colors">
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="p-1.5 hover:bg-surface-light rounded transition-colors">
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                  </button>
                  <button className="p-1.5 hover:bg-surface-light rounded transition-colors">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
