'use client';

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
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-all border ${
            selected === category
              ? 'border-[#8b5cf6] text-[#8b5cf6] bg-[rgba(139,92,246,0.1)]'
              : 'border-[#27272a] text-[#a1a1aa] hover:border-[#8b5cf6] hover:text-[#8b5cf6]'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
