'use client';

import { Modal, ModalHeader, ModalBody, Button } from '@plugspace/ui';
import { X, LayerGroup, Image, Th, Bars, Cube, Glasses, MessageSquare } from 'lucide-react';

interface LibraryModalProps {
  onClose: () => void;
}

const categories = [
  {
    title: 'Storefront Essentials',
    items: [
      { name: 'Hero Banner', icon: Image, description: 'Full-width hero section with CTA' },
      { name: 'Product Grid (3x3)', icon: Th, description: 'Responsive product grid layout' },
      { name: 'Mega Menu', icon: Bars, description: 'Multi-column navigation menu' },
    ],
  },
  {
    title: 'Premium Features',
    items: [
      { name: '360° Product Spin', icon: Cube, description: 'Interactive product viewer', premium: true },
      { name: 'AR Try On', icon: Glasses, description: 'Augmented reality experience', premium: true },
      { name: 'Live Chat Widget', icon: MessageSquare, description: 'Real-time customer support', premium: true },
    ],
  },
];

export default function LibraryModal({ onClose }: LibraryModalProps) {
  return (
    <Modal open={true} onClose={onClose} size="full">
      <ModalHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <LayerGroup className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Component Library</h2>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-8">
          {categories.map((category, catIndex) => (
            <div key={catIndex}>
              <h3 className="text-lg font-semibold text-white mb-4">{category.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={itemIndex}
                      className="bg-[#1e293b] border border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
                    >
                      <div className="h-32 bg-slate-800 rounded-lg mb-3 flex items-center justify-center hover:bg-slate-700 transition-colors">
                        <Icon className="w-8 h-8 text-[#94a3b8]" />
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{item.name}</h4>
                        {item.premium && (
                          <span className="px-2 py-1 bg-[#8b5cf6] text-white text-xs rounded">
                            Premium
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#94a3b8]">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ModalBody>
    </Modal>
  );
}
