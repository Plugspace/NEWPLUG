/**
 * Landing Page - EXACT SPECIFICATION
 * Pixel-perfect implementation matching provided HTML template
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import TemplateCard from '@/components/TemplateCard';
import CategoryPills from '@/components/CategoryPills';
import { useRouter } from 'next/navigation';

const TEMPLATE_CATEGORIES = [
  'All',
  'Fashion',
  'Technology',
  'Food & Restaurant',
  'Health & Fitness',
  'Travel',
  'Real Estate',
  'Education',
  'Entertainment',
  'Business',
  'E-commerce',
  'Portfolio',
  'Blog',
];

export default function LandingPage() {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showingCount, setShowingCount] = useState(25);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);
        setInputValue(fullTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current?.start();
        }
      };
    }
  }, [isListening]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && templates.length > showingCount) {
          setShowingCount((prev) => Math.min(prev + 25, templates.length));
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [showingCount, templates.length]);

  // Load templates
  useEffect(() => {
    // TODO: Fetch from tRPC API
    // For now, generate mock templates
    const mockTemplates = Array.from({ length: 50 }, (_, i) => ({
      id: `template-${i}`,
      name: `Template ${i + 1}`,
      category: TEMPLATE_CATEGORIES[(i % 12) + 1] || 'All',
      type: i % 3 === 0 ? 'product-grid' : 'gradient',
      previewImage: null,
    }));
    setTemplates(mockTemplates);
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      // Navigate to studio with prompt
      router.push(`/studio?prompt=${encodeURIComponent(inputValue)}`);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch = !searchQuery || template.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Inter',system-ui,sans-serif]">
      {/* Navigation Bar - 56px height */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#27272a]">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">Plug</span>
            <span className="text-2xl font-bold text-[#8b5cf6]">space</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#templates" className="text-[#a1a1aa] hover:text-white transition-colors">
              Templates
            </a>
            <a href="/studio" className="text-[#a1a1aa] hover:text-white transition-colors">
              Studio
            </a>
            <a href="/admin" className="text-[#a1a1aa] hover:text-white transition-colors">
              Admin
            </a>
            <button className="px-4 py-2 bg-[#8b5cf6] rounded-lg hover:bg-[#7c3aed] transition-colors">
              Sign In
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center py-10 px-6 pt-32">
        <div className="container mx-auto text-center max-w-4xl">
          {/* Microphone - 160x160px */}
          <div className="flex flex-col items-center gap-8 mb-12">
            <div className="relative">
              {/* Microphone Button */}
              <button
                onClick={toggleListening}
                className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-gradient-to-r from-purple-500 to-green-500 animate-pulse'
                    : 'bg-[#1a1a1a] hover:bg-[#27272a]'
                }`}
              >
                <Mic className="w-16 h-16 text-white" />
                
                {/* Animated Wave Rings - 3 rings */}
                {isListening && (
                  <>
                    <motion.div
                      className="absolute inset-[-10px] rounded-full border-2 border-purple-500"
                      animate={{
                        scale: [1, 1.5, 2],
                        opacity: [1, 0.5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut',
                      }}
                    />
                    <motion.div
                      className="absolute inset-[-25px] rounded-full border-2 border-purple-500"
                      animate={{
                        scale: [1, 1.5, 2],
                        opacity: [1, 0.5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: 0.4,
                        ease: 'easeOut',
                      }}
                    />
                    <motion.div
                      className="absolute inset-[-40px] rounded-full border-2 border-purple-500"
                      animate={{
                        scale: [1, 1.5, 2],
                        opacity: [1, 0.5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: 0.8,
                        ease: 'easeOut',
                      }}
                    />
                  </>
                )}
              </button>

              {/* Sound Bars - 5 bars with staggered animation */}
              {isListening && (
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex items-end gap-1 h-8">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-gradient-to-t from-purple-500 to-green-500 rounded-full"
                      animate={{
                        height: ['12px', '20px', '28px', '20px', '12px'],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-light mb-4">
              If you can say it,{' '}
              <span className="italic text-[#8b5cf6]">I can build it</span>
            </h1>

            {/* Input Box - max-width 700px */}
            <div className="w-full max-w-[700px] mx-auto">
              <div className="relative bg-[#111] border border-[#27272a] rounded-2xl p-5">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="e.g Create a website for Dog Grooming business"
                  className="w-full bg-transparent text-white placeholder:text-[#71717a] focus:outline-none resize-none text-lg"
                  rows={3}
                />
                <div className="mt-2 text-xs text-[#71717a]">
                  Try: "Add product filtering" · "Create checkout page"
                </div>
                <button
                  onClick={handleSubmit}
                  className="absolute bottom-5 right-5 px-4 py-2 bg-[#8b5cf6] rounded-lg hover:bg-[#7c3aed] transition-colors"
                >
                  Build
                </button>
              </div>
            </div>

            {/* Transcript Display */}
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl w-full bg-[#111] rounded-lg p-4 border border-[#27272a]"
              >
                <p className="text-[#a1a1aa] text-sm">{transcript}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="px-6 mb-12">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#71717a] w-5 h-5" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#111] border border-[#27272a] rounded-lg text-white placeholder:text-[#71717a] focus:outline-none focus:border-[#8b5cf6] transition-colors"
              />
            </div>
          </div>

          {/* Category Pills */}
          <CategoryPills
            categories={TEMPLATE_CATEGORIES}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>
      </section>

      {/* Templates Grid */}
      <section id="templates" className="px-6 pb-20">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.slice(0, showingCount).map((template, index) => (
              <TemplateCard key={template.id || index} template={template} />
            ))}
          </div>
          
          {/* Infinite Scroll Trigger */}
          <div ref={loadMoreRef} className="h-10" />
          
          {/* Showing Count */}
          {filteredTemplates.length > 0 && (
            <div className="text-center mt-8 text-[#71717a] text-sm">
              Showing {Math.min(showingCount, filteredTemplates.length)} of {filteredTemplates.length} templates
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
