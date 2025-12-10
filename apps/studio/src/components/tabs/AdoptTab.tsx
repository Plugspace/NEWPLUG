'use client';

import { Globe } from 'lucide-react';
import { Button, Input } from '@plugspace/ui';

export default function AdoptTab() {
  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <Globe className="w-12 h-12 text-[#94a3b8] mx-auto mb-4" />
        <p className="text-sm text-[#94a3b8]">
          Clone any website and adopt its design
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-white mb-2 block">
          Website URL
        </label>
        <Input placeholder="https://example.com" />
      </div>

      <Button variant="indigo" className="w-full">
        Analyze Website
      </Button>

      <div className="bg-[#1e293b] rounded-lg p-4">
        <pre className="text-xs text-[#94a3b8] font-mono overflow-auto">
          {`[Sherlock Agent]
Analyzing website structure...
Extracting design system...
Generating theme...`}
        </pre>
      </div>
    </div>
  );
}
