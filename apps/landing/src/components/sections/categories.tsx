'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
  { id: null, name: 'All', icon: '✨' },
  { id: 'fashion', name: 'Fashion', icon: '👗' },
  { id: 'food', name: 'Food & Beverage', icon: '🍕' },
  { id: 'tech', name: 'Technology', icon: '💻' },
  { id: 'portfolio', name: 'Portfolio', icon: '🎨' },
  { id: 'ecommerce', name: 'E-commerce', icon: '🛒' },
  { id: 'blog', name: 'Blog', icon: '📝' },
  { id: 'agency', name: 'Agency', icon: '🏢' },
  { id: 'saas', name: 'SaaS', icon: '☁️' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️' },
  { id: 'fitness', name: 'Fitness', icon: '💪' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'medical', name: 'Medical', icon: '🏥' },
];

interface CategoriesSectionProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export function CategoriesSection({ selectedCategory, onSelectCategory }: CategoriesSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-8 bg-background sticky top-16 z-40 border-b border-surface-light/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center">
          {/* Scroll Left Button */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 z-10 p-2 bg-gradient-to-r from-background via-background to-transparent pr-8 hidden sm:flex items-center"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
          </button>

          {/* Categories */}
          <div
            ref={scrollRef}
            className="flex items-center space-x-3 overflow-x-auto category-scroll py-2 px-8 sm:px-12"
          >
            {categories.map((category, index) => (
              <motion.button
                key={category.id ?? 'all'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200',
                  selectedCategory === category.id
                    ? 'bg-primary-700 text-white shadow-lg shadow-primary-700/25'
                    : 'bg-surface hover:bg-surface-light text-gray-300 border border-surface-light'
                )}
              >
                <span>{category.icon}</span>
                <span className="text-sm font-medium">{category.name}</span>
              </motion.button>
            ))}
          </div>

          {/* Scroll Right Button */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 z-10 p-2 bg-gradient-to-l from-background via-background to-transparent pl-8 hidden sm:flex items-center"
          >
            <ChevronRight className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
          </button>
        </div>
      </div>
    </section>
  );
}
