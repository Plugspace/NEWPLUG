/**
 * Landing Page - Template 1
 * Pixel-perfect implementation with voice activation
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TemplateCard from '@/components/TemplateCard';
import VoiceIndicator from '@/components/VoiceIndicator';
import CategoryPills from '@/components/CategoryPills';

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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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

        setTranscript(finalTranscript || interimTranscript);
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">Plug</span>
            <span className="text-2xl font-bold text-[#8b5cf6]">space</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#templates" className="hover:text-[#8b5cf6] transition-colors">
              Templates
            </a>
            <a href="#features" className="hover:text-[#8b5cf6] transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-[#8b5cf6] transition-colors">
              Pricing
            </a>
            <button className="px-4 py-2 bg-[#8b5cf6] rounded-lg hover:bg-[#7c3aed] transition-colors">
              Sign In
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              Build Websites with
              <br />
              <span className="text-[#8b5cf6]">Your Voice</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto">
              The future of web development. Just speak, and watch your website come to life.
            </p>

            {/* Voice Activation */}
            <div className="flex flex-col items-center gap-8 mb-16">
              <div className="relative">
                {/* Microphone Button */}
                <button
                  onClick={toggleListening}
                  className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? 'bg-[#8b5cf6] scale-110'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Mic className="w-16 h-16" />
                  
                  {/* Animated Wave Rings */}
                  {isListening && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-[#8b5cf6]"
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
                        className="absolute inset-0 rounded-full border-2 border-[#8b5cf6]"
                        animate={{
                          scale: [1, 1.5, 2],
                          opacity: [1, 0.5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: 0.5,
                          ease: 'easeOut',
                        }}
                      />
                    </>
                  )}
                </button>

                {/* Sound Bars */}
                {isListening && (
                  <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex items-end gap-1 h-8">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-[#8b5cf6] rounded-full"
                        animate={{
                          height: ['8px', '32px', '8px'],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.1,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Transcript Display */}
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl w-full bg-white/5 rounded-lg p-4 border border-white/10"
                >
                  <p className="text-lg">{transcript}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="px-6 mb-12">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#8b5cf6] transition-colors"
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
            {templates.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <p className="text-gray-400 text-lg">Loading templates...</p>
              </div>
            ) : (
              templates.map((template, index) => (
                <TemplateCard key={template.id || index} template={template} />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
