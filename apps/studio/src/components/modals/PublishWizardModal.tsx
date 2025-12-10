'use client';

import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@plugspace/ui';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';

interface PublishWizardModalProps {
  onClose: () => void;
}

type Step = 'name' | 'domain' | 'connect' | 'final' | 'success';

export default function PublishWizardModal({ onClose }: PublishWizardModalProps) {
  const [step, setStep] = useState<Step>('name');
  const [businessName, setBusinessName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');

  const steps = [
    { id: 'name' as Step, title: "Let's name your project" },
    { id: 'domain' as Step, title: 'Select a Domain' },
    { id: 'connect' as Step, title: 'Connect Existing Domain' },
    { id: 'final' as Step, title: 'Ready to Launch!' },
    { id: 'success' as Step, title: 'Congratulations!' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  const handleNext = () => {
    if (step === 'name') setStep('domain');
    else if (step === 'domain') setStep('connect');
    else if (step === 'connect') setStep('final');
    else if (step === 'final') setStep('success');
  };

  const handleBack = () => {
    if (step === 'domain') setStep('name');
    else if (step === 'connect') setStep('domain');
    else if (step === 'final') setStep('connect');
  };

  return (
    <Modal open={true} onClose={onClose} size="lg">
      <ModalHeader>
        <h2 className="text-2xl font-bold text-white">{steps[currentStepIndex].title}</h2>
      </ModalHeader>
      <ModalBody>
        {step === 'name' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Business Name
              </label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter your business name"
              />
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1">
                Transfer Domain
              </Button>
              <Button variant="outline" className="flex-1">
                Find New Domain
              </Button>
            </div>
          </div>
        )}

        {step === 'domain' && (
          <div className="space-y-4">
            <p className="text-sm text-[#94a3b8] mb-4">
              Powered by Hostinger API
            </p>
            <div className="space-y-2">
              {['example.com', 'example.net', 'example.org'].map((domain) => (
                <button
                  key={domain}
                  onClick={() => setSelectedDomain(domain)}
                  className={`w-full p-4 text-left border rounded-lg transition-colors ${
                    selectedDomain === domain
                      ? 'border-[#8b5cf6] bg-[#8b5cf6]/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white">{domain}</span>
                    {selectedDomain === domain && (
                      <Check className="w-5 h-5 text-[#8b5cf6]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'connect' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Domain Name
              </label>
              <Input placeholder="yourdomain.com" />
            </div>
            <div className="bg-[#1e293b] rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">DNS Records</h4>
              <div className="space-y-2 text-xs text-[#94a3b8] font-mono">
                <p>Type A: @ → 192.0.2.1</p>
                <p>CNAME: www → yourproject.projects.plugspace.io</p>
              </div>
            </div>
          </div>
        )}

        {step === 'final' && (
          <div className="space-y-4">
            <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Included Features</h4>
              <ul className="space-y-1 text-sm text-[#94a3b8]">
                <li>✓ SSL Certificate</li>
                <li>✓ Global CDN</li>
                <li>✓ Auto-scaling</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-white" />
            </div>
            <p className="text-white">Your website is live!</p>
            <p className="text-[#8b5cf6] text-lg font-semibold">
              https://{selectedDomain || businessName.toLowerCase()}.projects.plugspace.io
            </p>
            <div className="flex justify-center gap-4 pt-4">
              {['Instagram', 'Facebook', 'Twitter', 'TikTok', 'LinkedIn'].map((social) => (
                <button
                  key={social}
                  className="px-4 py-2 bg-[#1e293b] rounded-lg text-sm text-white hover:bg-[#1e293b]/80"
                >
                  {social}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {steps.map((s, index) => (
            <div
              key={s.id}
              className={`w-2 h-2 rounded-full ${
                index <= currentStepIndex ? 'bg-[#8b5cf6]' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </ModalBody>
      {step !== 'success' && (
        <ModalFooter>
          {currentStepIndex > 0 && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button variant="indigo" onClick={handleNext} className="ml-auto">
            {step === 'final' ? 'Publish Live' : 'Next'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
}
