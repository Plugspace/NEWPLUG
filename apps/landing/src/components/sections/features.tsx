'use client';

import { motion } from 'framer-motion';
import { 
  Mic, 
  Brain, 
  Palette, 
  Globe, 
  Zap, 
  Shield, 
  Users, 
  Code 
} from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'Voice-First Development',
    description: 'Build websites by simply speaking. Our AI understands natural language and turns your words into beautiful designs.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Brain,
    title: 'AI-Powered Agents',
    description: 'Five specialized AI agents work together: Don (architect), Mark (developer), Jessica (designer), Sherlock (cloner), and Zara (assistant).',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Palette,
    title: 'Stunning Templates',
    description: 'Choose from hundreds of professionally designed templates across 12+ categories. Each one is fully customizable.',
    color: 'from-orange-500 to-yellow-500',
  },
  {
    icon: Globe,
    title: 'One-Click Publishing',
    description: 'Deploy your website instantly with our integrated hosting. Get a free subdomain or connect your custom domain.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Zap,
    title: 'Blazing Fast Performance',
    description: 'Sub-100ms API response times, optimized assets, and global CDN ensure your sites load instantly everywhere.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC2 and GDPR compliant. SSL certificates, DDoS protection, and end-to-end encryption keep your data safe.',
    color: 'from-red-500 to-pink-500',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Work together in real-time. Share projects, assign roles, and maintain version history across your organization.',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    icon: Code,
    title: 'Full Code Access',
    description: 'Export clean, production-ready code anytime. No lock-in, no proprietary formats—just standard HTML, CSS, and JavaScript.',
    color: 'from-cyan-500 to-blue-500',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-background via-surface/30 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-2 rounded-full bg-surface border border-surface-light text-sm text-gray-300 mb-4"
          >
            Why Choose Plugspace
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            Everything You Need to Build
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto"
          >
            From idea to production in minutes, not months. Plugspace gives you 
            the tools to build, deploy, and scale beautiful websites.
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-6 bg-surface rounded-xl border border-surface-light hover:border-primary-700/50 transition-all duration-300"
            >
              <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${feature.color} mb-4`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-500 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
