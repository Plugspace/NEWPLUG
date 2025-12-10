'use client';

import { useState } from 'react';
import { X, Search, LayoutGrid, Type, Image, Box, FormInput, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LibraryModalProps {
  onClose: () => void;
}

const categories = [
  { id: 'all', name: 'All', icon: LayoutGrid },
  { id: 'layout', name: 'Layout', icon: Box },
  { id: 'text', name: 'Text', icon: Type },
  { id: 'media', name: 'Media', icon: Image },
  { id: 'forms', name: 'Forms', icon: FormInput },
  { id: 'lists', name: 'Lists', icon: List },
];

const components = [
  { id: 'hero-1', name: 'Hero Section', category: 'layout', preview: 'https://picsum.photos/seed/hero1/200/120' },
  { id: 'hero-2', name: 'Hero with Image', category: 'layout', preview: 'https://picsum.photos/seed/hero2/200/120' },
  { id: 'features-1', name: 'Features Grid', category: 'layout', preview: 'https://picsum.photos/seed/feat1/200/120' },
  { id: 'cta-1', name: 'CTA Banner', category: 'layout', preview: 'https://picsum.photos/seed/cta1/200/120' },
  { id: 'heading-1', name: 'Heading', category: 'text', preview: 'https://picsum.photos/seed/head1/200/120' },
  { id: 'paragraph-1', name: 'Paragraph', category: 'text', preview: 'https://picsum.photos/seed/para1/200/120' },
  { id: 'image-1', name: 'Image', category: 'media', preview: 'https://picsum.photos/seed/img1/200/120' },
  { id: 'gallery-1', name: 'Image Gallery', category: 'media', preview: 'https://picsum.photos/seed/gal1/200/120' },
  { id: 'contact-1', name: 'Contact Form', category: 'forms', preview: 'https://picsum.photos/seed/form1/200/120' },
  { id: 'newsletter-1', name: 'Newsletter', category: 'forms', preview: 'https://picsum.photos/seed/news1/200/120' },
  { id: 'testimonials-1', name: 'Testimonials', category: 'lists', preview: 'https://picsum.photos/seed/test1/200/120' },
  { id: 'pricing-1', name: 'Pricing Table', category: 'lists', preview: 'https://picsum.photos/seed/price1/200/120' },
];

export function LibraryModal({ onClose }: LibraryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredComponents = components.filter((comp) => {
    const matchesCategory = selectedCategory === 'all' || comp.category === selectedCategory;
    const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-surface rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-light">
          <h2 className="text-xl font-semibold text-white">Component Library</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-light rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-surface-light p-4 flex-shrink-0">
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors',
                    selectedCategory === cat.id
                      ? 'bg-primary-700/20 text-primary-500'
                      : 'text-gray-400 hover:text-white hover:bg-surface-light'
                  )}
                >
                  <cat.icon className="w-4 h-4" />
                  <span className="text-sm">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-surface-light">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search components..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background border border-surface-light rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary-700"
                />
              </div>
            </div>

            {/* Components Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredComponents.map((comp) => (
                  <div
                    key={comp.id}
                    className="bg-background rounded-lg overflow-hidden border border-surface-light hover:border-primary-700 transition-colors cursor-pointer group"
                    draggable
                  >
                    <div className="aspect-[5/3] overflow-hidden">
                      <img
                        src={comp.preview}
                        alt={comp.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-medium text-white">{comp.name}</h4>
                    </div>
                  </div>
                ))}
              </div>

              {filteredComponents.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No components found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
