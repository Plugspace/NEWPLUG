'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { HeroSection } from '@/components/sections/hero';
import { CategoriesSection } from '@/components/sections/categories';
import { TemplatesGrid } from '@/components/sections/templates-grid';
import { FeaturesSection } from '@/components/sections/features';
import { CTASection } from '@/components/sections/cta';
import { Footer } from '@/components/layout/footer';
import { VoiceOverlay } from '@/components/voice/voice-overlay';
import { useVoiceStore } from '@/stores/voice-store';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { isListening } = useVoiceStore();

  return (
    <main className="min-h-screen bg-background">
      <Header onSearch={setSearchQuery} />
      
      <HeroSection />
      
      <CategoriesSection 
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
      
      <TemplatesGrid 
        category={selectedCategory}
        searchQuery={searchQuery}
      />
      
      <FeaturesSection />
      
      <CTASection />
      
      <Footer />
      
      {isListening && <VoiceOverlay />}
    </main>
  );
}
