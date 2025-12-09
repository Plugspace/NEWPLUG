'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    category: string;
    previewImage?: string;
    thumbnailImage?: string;
    type?: string;
  };
}

export default function TemplateCard({ template }: TemplateCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="group relative bg-white/5 rounded-lg overflow-hidden border border-white/10 cursor-pointer transition-all hover:border-[#8b5cf6]"
    >
      {/* Browser Chrome */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
      </div>

      {/* Preview Image */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-[#8b5cf6]/20 to-[#1e293b]">
        {template.thumbnailImage ? (
          <Image
            src={template.thumbnailImage}
            alt={template.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold text-white/20">{template.name[0]}</div>
          </div>
        )}

        {/* Gradient Overlay for non-product templates */}
        {template.type !== 'product' && (
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        )}
      </div>

      {/* Template Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
        <p className="text-sm text-gray-400">{template.category}</p>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-[#8b5cf6]/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button className="px-6 py-3 bg-[#8b5cf6] rounded-lg font-semibold transform translate-y-4 group-hover:translate-y-0 transition-transform">
          Use Template
        </button>
      </div>
    </motion.div>
  );
}
