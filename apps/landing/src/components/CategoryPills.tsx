'use client';

import { motion } from 'framer-motion';

interface CategoryPillsProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategoryPills({
  categories,
  selected,
  onSelect,
}: CategoryPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
            selected === category
              ? 'bg-[#8b5cf6] text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
