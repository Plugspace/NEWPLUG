'use client';

import { Library, Image as ImageIcon } from 'lucide-react';
import { Button } from '@plugspace/ui';

interface LibraryTabProps {
  onFullLibraryClick: () => void;
}

export default function LibraryTab({ onFullLibraryClick }: LibraryTabProps) {
  return (
    <div className="p-4 space-y-6">
      <Button variant="outline" className="w-full" onClick={onFullLibraryClick}>
        <Library className="w-4 h-4 mr-2" />
        Full Library
      </Button>

      <div>
        <label className="text-sm font-medium text-white mb-2 block">
          Component Prompt
        </label>
        <textarea
          placeholder="Describe the component you want..."
          className="w-full px-3 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#8b5cf6] resize-none"
          rows={3}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-white mb-2 block">
          Image Studio
        </label>
        <textarea
          placeholder="Describe the image you want to generate..."
          className="w-full px-3 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#8b5cf6] resize-none mb-2"
          rows={3}
        />
        <Button variant="gradient" className="w-full">
          <ImageIcon className="w-4 h-4 mr-2" />
          Generate Image
        </Button>
      </div>

      <div>
        <h4 className="text-sm font-medium text-white mb-3">Quick Themes</h4>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-square bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg cursor-pointer hover:scale-105 transition-transform"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
