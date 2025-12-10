'use client';

import { useState } from 'react';

interface StudioCanvasProps {
  device: 'desktop' | 'tablet' | 'mobile';
}

export default function StudioCanvas({ device }: StudioCanvasProps) {
  const [components, setComponents] = useState<any[]>([]);

  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  return (
    <div className="flex-1 bg-[#1e293b] overflow-auto p-8">
      <div
        className="mx-auto bg-white rounded-lg shadow-2xl transition-all duration-300"
        style={{
          width: deviceWidths[device],
          minHeight: '1000px',
        }}
      >
        {/* Site Canvas */}
        <div className="min-h-[1000px] bg-white">
          {components.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Start building by adding components from the library</p>
            </div>
          ) : (
            components.map((component, index) => (
              <div
                key={index}
                className="group relative border-2 border-transparent hover:border-blue-500 transition-colors"
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button className="p-1 bg-[#1e293b] text-white rounded">
                    ×
                  </button>
                  <button className="p-1 bg-[#1e293b] text-white rounded">
                    🎨
                  </button>
                </div>
                {component}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3">
        <button className="px-4 py-2 bg-white text-gray-900 rounded-lg shadow-lg hover:bg-gray-100">
          👁️ Preview
        </button>
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg shadow-green-500/20 hover:bg-green-700">
          📤 Publish
        </button>
      </div>
    </div>
  );
}
