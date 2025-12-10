'use client';

import { motion } from 'framer-motion';
import { Search, User, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    category: string;
    previewImage?: string;
    thumbnailImage?: string;
    type?: 'product-grid' | 'gradient';
  };
}

export default function TemplateCard({ template }: TemplateCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/studio?template=${template.id}`);
  };

  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="group relative bg-[#111] rounded-lg overflow-hidden border border-[#27272a] cursor-pointer transition-all hover:border-[#8b5cf6] hover:shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
      onClick={handleClick}
    >
      {/* Browser Chrome */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#27272a]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-[#71717a]" />
          <User className="w-4 h-4 text-[#71717a]" />
          <ShoppingCart className="w-4 h-4 text-[#71717a]" />
        </div>
      </div>

      {/* Preview - Aspect Ratio 4/5 */}
      <div className="relative aspect-[4/5] bg-gradient-to-br from-violet-600 to-fuchsia-600">
        {template.type === 'product-grid' ? (
          // Product Grid Preview (3x3)
          <div className="absolute inset-0 p-4 bg-white">
            <div className="flex gap-2 mb-4">
              {['All', 'Women', 'Men'].map((nav) => (
                <button
                  key={nav}
                  className="px-3 py-1 text-xs bg-gray-100 rounded"
                >
                  {nav}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded"
                />
              ))}
            </div>
          </div>
        ) : (
          // Gradient Preview
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <h3 className="text-2xl font-bold mb-2">{template.name}</h3>
              <p className="text-sm opacity-80">{template.category}</p>
            </div>
          </div>
        )}

        {/* Gradient Overlay for non-product templates */}
        {template.type !== 'product-grid' && (
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        )}
      </div>

      {/* Template Info */}
      <div className="p-4 bg-[#111]">
        <h3 className="font-semibold text-white mb-1">{template.name}</h3>
        <p className="text-sm text-[#71717a]">{template.category}</p>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-[#8b5cf6]/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
        <button className="px-6 py-3 bg-[#8b5cf6] rounded-lg font-semibold text-white transform translate-y-4 group-hover:translate-y-0 transition-transform">
          Use Template
        </button>
      </div>
    </motion.div>
  );
}
