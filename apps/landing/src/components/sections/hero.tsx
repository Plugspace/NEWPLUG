'use client';

import { motion } from 'framer-motion';
import { Mic, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceStore } from '@/stores/voice-store';

export function HeroSection() {
  const { startListening } = useVoiceStore();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-900/20 via-background to-background" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-700/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center px-4 py-2 rounded-full bg-surface border border-surface-light mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary-500 mr-2" />
            <span className="text-sm text-gray-300">Introducing Titan v1.4</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6"
          >
            Build Websites with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-700">
              Your Voice
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto mb-12"
          >
            Plugspace Titan combines cutting-edge AI with voice-first interaction 
            to revolutionize how you create stunning websites. Just speak, and watch 
            your ideas come to life.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Button 
              variant="primary" 
              size="lg"
              onClick={startListening}
              className="group"
            >
              <Mic className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Start Speaking
            </Button>
            <Button variant="secondary" size="lg">
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Animated Microphone */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative inline-flex items-center justify-center"
          >
            <div className="relative w-40 h-40">
              {/* Animated rings */}
              <div className="absolute inset-0 rounded-full border-2 border-primary-700/30 animate-ring-1" />
              <div className="absolute inset-0 rounded-full border-2 border-primary-700/20 animate-ring-2" />
              <div className="absolute inset-0 rounded-full border-2 border-primary-700/10 animate-ring-3" />
              
              {/* Center microphone */}
              <button
                onClick={startListening}
                className="absolute inset-4 bg-gradient-to-br from-primary-600 to-primary-800 rounded-full flex items-center justify-center shadow-2xl shadow-primary-700/50 hover:shadow-primary-600/60 transition-all duration-300 hover:scale-105"
              >
                <Mic className="w-12 h-12 text-white" />
              </button>
            </div>

            {/* Sound bars below */}
            <div className="absolute -bottom-8 flex items-end justify-center space-x-1 h-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-gradient-to-t from-primary-700 to-primary-500 rounded-full"
                  animate={{
                    height: ['12px', '24px', '12px'],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { value: '10K+', label: 'Active Users' },
              { value: '50K+', label: 'Sites Created' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '<100ms', label: 'Response Time' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
