'use client';

import { useState } from 'react';
import { X, Globe, Lock, Share2, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublishWizardProps {
  onClose: () => void;
}

const steps = [
  { id: 1, title: 'Domain', icon: Globe },
  { id: 2, title: 'SEO', icon: Share2 },
  { id: 3, title: 'Security', icon: Lock },
  { id: 4, title: 'Review', icon: Check },
  { id: 5, title: 'Publish', icon: Check },
];

export function PublishWizard({ onClose }: PublishWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [subdomain, setSubdomain] = useState('my-awesome-site');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setIsPublished(true);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-surface rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-light">
          <h2 className="text-xl font-semibold text-white">Publish Your Site</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-light rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-8 py-4 border-b border-surface-light">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    currentStep >= step.id
                      ? 'bg-primary-700 text-white'
                      : 'bg-surface-light text-gray-400'
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-16 h-0.5 mx-2',
                      currentStep > step.id ? 'bg-primary-700' : 'bg-surface-light'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step) => (
              <span
                key={step.id}
                className={cn(
                  'text-xs',
                  currentStep >= step.id ? 'text-primary-500' : 'text-gray-500'
                )}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 min-h-[300px]">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Choose Your Domain</h3>
                <p className="text-sm text-gray-400">
                  Your site will be available at this address
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Subdomain</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 bg-background border border-surface-light rounded-l-lg px-4 py-3 text-white focus:outline-none focus:border-primary-700"
                  />
                  <span className="bg-surface-light px-4 py-3 text-gray-400 border border-l-0 border-surface-light rounded-r-lg">
                    .projects.plugspace.io
                  </span>
                </div>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <p className="text-sm text-gray-400">
                  Your site URL: <span className="text-primary-500">https://{subdomain}.projects.plugspace.io</span>
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">SEO Settings</h3>
                <p className="text-sm text-gray-400">
                  Optimize your site for search engines
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Page Title</label>
                  <input
                    type="text"
                    placeholder="My Awesome Website"
                    className="w-full bg-background border border-surface-light rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-700"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <textarea
                    placeholder="A brief description of your website..."
                    rows={3}
                    className="w-full bg-background border border-surface-light rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-700 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Security Settings</h3>
                <p className="text-sm text-gray-400">
                  Configure security features for your site
                </p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
                  <div>
                    <span className="text-white">SSL Certificate</span>
                    <p className="text-sm text-gray-500">Secure your site with HTTPS</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary-700" />
                </label>
                <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
                  <div>
                    <span className="text-white">CDN Enabled</span>
                    <p className="text-sm text-gray-500">Fast loading from anywhere</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary-700" />
                </label>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Review & Publish</h3>
                <p className="text-sm text-gray-400">
                  Review your settings before publishing
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-background rounded-lg">
                  <span className="text-gray-400">Domain</span>
                  <span className="text-white">{subdomain}.projects.plugspace.io</span>
                </div>
                <div className="flex justify-between p-3 bg-background rounded-lg">
                  <span className="text-gray-400">SSL</span>
                  <span className="text-green-500">Enabled</span>
                </div>
                <div className="flex justify-between p-3 bg-background rounded-lg">
                  <span className="text-gray-400">CDN</span>
                  <span className="text-green-500">Enabled</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="flex flex-col items-center justify-center py-8">
              {isPublishing ? (
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-primary-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white">Publishing your site...</p>
                </div>
              ) : isPublished ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Published!</h3>
                  <p className="text-gray-400 mb-4">Your site is now live</p>
                  <a
                    href={`https://${subdomain}.projects.plugspace.io`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-500 hover:underline"
                  >
                    https://{subdomain}.projects.plugspace.io
                  </a>
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">Ready to Publish?</h3>
                  <p className="text-gray-400 mb-6">Click the button below to make your site live</p>
                  <button
                    onClick={handlePublish}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Publish Now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isPublished && (
          <div className="flex justify-between p-4 border-t border-surface-light">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors',
                currentStep === 1
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-white hover:bg-surface-light'
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            {currentStep < 5 && (
              <button
                onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-700 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
