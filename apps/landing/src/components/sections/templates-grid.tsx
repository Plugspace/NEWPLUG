'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Eye, Download, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Template {
  id: string;
  name: string;
  category: string;
  type: string;
  previewImage: string;
  thumbnailImage: string;
  downloads: number;
  rating: number;
  featured: boolean;
}

// Mock templates for demonstration
const generateMockTemplates = (count: number, startIndex: number = 0): Template[] => {
  const categories = ['fashion', 'food', 'tech', 'portfolio', 'ecommerce', 'blog', 'agency', 'saas'];
  const types = ['product-grid', 'hero-banner', 'minimal'];
  
  return Array.from({ length: count }, (_, i) => {
    const index = startIndex + i;
    const category = categories[index % categories.length]!;
    return {
      id: `template-${index}`,
      name: `${category.charAt(0).toUpperCase() + category.slice(1)} Template ${index + 1}`,
      category,
      type: types[index % types.length]!,
      previewImage: `https://picsum.photos/seed/${index}/800/600`,
      thumbnailImage: `https://picsum.photos/seed/${index}/400/300`,
      downloads: Math.floor(Math.random() * 5000) + 100,
      rating: 3.5 + Math.random() * 1.5,
      featured: index < 6,
    };
  });
};

interface TemplatesGridProps {
  category: string | null;
  searchQuery: string;
}

export function TemplatesGrid({ category, searchQuery }: TemplatesGridProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    
    // Simulate API call
    setTimeout(() => {
      const newTemplates = generateMockTemplates(ITEMS_PER_PAGE);
      setTemplates(newTemplates);
      setIsLoading(false);
      setHasMore(true);
    }, 500);
  }, [category, searchQuery]);

  // Load more
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    setTimeout(() => {
      const newTemplates = generateMockTemplates(ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
      setTemplates(prev => [...prev, ...newTemplates]);
      setPage(prev => prev + 1);
      setIsLoading(false);
      setHasMore(page < 5); // Limit to 5 pages for demo
    }, 500);
  }, [isLoading, hasMore, page]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (category && template.category !== category) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <section className="py-12 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Templates` : 'All Templates'}
            </h2>
            <p className="text-gray-400 mt-1">
              {filteredTemplates.length} templates available
            </p>
          </div>
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((template, index) => (
            <TemplateCard key={template.id} template={template} index={index} />
          ))}

          {/* Loading Skeletons */}
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="bg-surface rounded-xl overflow-hidden"
              >
                <div className="aspect-[4/3] loading-skeleton" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 loading-skeleton rounded" />
                  <div className="h-3 w-1/2 loading-skeleton rounded" />
                </div>
              </div>
            ))}
        </div>

        {/* Load More Button (fallback) */}
        {hasMore && !isLoading && (
          <div className="text-center mt-12">
            <Button variant="secondary" onClick={loadMore}>
              Load More Templates
            </Button>
          </div>
        )}

        {/* No Results */}
        {!isLoading && filteredTemplates.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No templates found</p>
            <p className="text-gray-500 mt-2">Try adjusting your search or category filter</p>
          </div>
        )}
      </div>
    </section>
  );
}

function TemplateCard({ template, index }: { template: Template; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="template-card bg-surface rounded-xl overflow-hidden border border-surface-light cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Browser Chrome */}
      <div className="bg-surface-light px-4 py-2 flex items-center space-x-2">
        <div className="browser-dot browser-dot-red" />
        <div className="browser-dot browser-dot-yellow" />
        <div className="browser-dot browser-dot-green" />
        <div className="flex-1 ml-4">
          <div className="h-4 bg-surface rounded-full w-1/2" />
        </div>
      </div>

      {/* Preview Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={template.previewImage}
          alt={template.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Overlay on hover */}
        <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 flex items-center justify-center ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex space-x-3">
            <Button variant="primary" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button variant="secondary" size="sm">
              Use Template
            </Button>
          </div>
        </div>

        {/* Featured badge */}
        {template.featured && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-primary-700 rounded-full text-xs font-medium">
            Featured
          </div>
        )}

        {/* Gradient overlay for non-product templates */}
        {template.type !== 'product-grid' && (
          <div className="absolute bottom-0 left-0 right-0 h-1/3 template-overlay" />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-white truncate">{template.name}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-400 capitalize">{template.category}</span>
          <div className="flex items-center space-x-3 text-sm text-gray-400">
            <span className="flex items-center">
              <Download className="w-3 h-3 mr-1" />
              {template.downloads.toLocaleString()}
            </span>
            <span className="flex items-center">
              <Star className="w-3 h-3 mr-1 text-yellow-500" />
              {template.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
