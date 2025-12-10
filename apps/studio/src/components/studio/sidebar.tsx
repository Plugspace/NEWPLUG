'use client';

import { useState } from 'react';
import { 
  MessageSquare, 
  LayoutGrid, 
  Wand2, 
  Mic,
  Send,
  Loader2
} from 'lucide-react';
import { useStudioStore, ChatMessage } from '@/stores/studio-store';
import { cn } from '@/lib/utils';
import { generateId } from '@/lib/utils';

interface SidebarProps {
  onOpenLibrary: () => void;
}

const tabs = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'library', icon: LayoutGrid, label: 'Library' },
  { id: 'adopt', icon: Wand2, label: 'Adopt' },
  { id: 'zara', icon: Mic, label: 'Zara' },
] as const;

export function Sidebar({ onOpenLibrary }: SidebarProps) {
  const { activeSidebarTab, setActiveSidebarTab } = useStudioStore();

  return (
    <aside className="w-80 bg-surface border-r border-surface-light flex flex-col">
      {/* Tab Buttons */}
      <div className="flex border-b border-surface-light">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => {
              if (id === 'library') {
                onOpenLibrary();
              } else {
                setActiveSidebarTab(id);
              }
            }}
            className={cn(
              'flex-1 flex flex-col items-center py-3 transition-colors relative',
              activeSidebarTab === id
                ? 'text-primary-500'
                : 'text-gray-400 hover:text-white'
            )}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{label}</span>
            {activeSidebarTab === id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeSidebarTab === 'chat' && <ChatTab />}
        {activeSidebarTab === 'adopt' && <AdoptTab />}
        {activeSidebarTab === 'zara' && <ZaraTab />}
      </div>
    </aside>
  );
}

function ChatTab() {
  const { chatMessages, isAgentTyping, addChatMessage, setAgentTyping } = useStudioStore();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    addChatMessage(userMessage);
    setInput('');
    setAgentTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `I understand you want to "${input}". Let me help you with that. I'll analyze your request and make the necessary changes to your design.`,
        timestamp: new Date(),
        agentName: 'Zara',
      };
      addChatMessage(aiMessage);
      setAgentTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'max-w-[85%]',
              message.role === 'user' ? 'ml-auto' : 'mr-auto'
            )}
          >
            {message.role === 'assistant' && message.agentName && (
              <div className="text-xs text-primary-500 mb-1">
                {message.agentName}
              </div>
            )}
            <div
              className={cn(
                'px-4 py-3 text-sm',
                message.role === 'user'
                  ? 'chat-bubble-user text-white'
                  : 'chat-bubble-ai text-gray-200'
              )}
            >
              {message.content}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}

        {isAgentTyping && (
          <div className="max-w-[85%] mr-auto">
            <div className="text-xs text-primary-500 mb-1">Zara</div>
            <div className="chat-bubble-ai px-4 py-3 flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-surface-light">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Tell me what to build..."
            className="flex-1 bg-background border border-surface-light rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-700"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isAgentTyping}
            className={cn(
              'p-2 rounded-lg transition-colors',
              input.trim() && !isAgentTyping
                ? 'bg-primary-700 text-white hover:bg-primary-600'
                : 'bg-surface-light text-gray-500 cursor-not-allowed'
            )}
          >
            {isAgentTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdoptTab() {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Adopt a Design</h3>
      <p className="text-sm text-gray-400 mb-6">
        Paste a URL to clone an existing website's design, or upload an image to extract design elements.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Website URL</label>
          <input
            type="url"
            placeholder="https://example.com"
            className="w-full bg-background border border-surface-light rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-700"
          />
        </div>
        
        <div className="text-center text-gray-500 text-sm">or</div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-2">Upload Image</label>
          <div className="border-2 border-dashed border-surface-light rounded-lg p-8 text-center hover:border-primary-700 transition-colors cursor-pointer">
            <p className="text-sm text-gray-400">
              Drop an image here or click to upload
            </p>
          </div>
        </div>
        
        <button className="w-full bg-primary-700 hover:bg-primary-600 text-white py-2 rounded-lg transition-colors">
          Analyze Design
        </button>
      </div>
    </div>
  );
}

function ZaraTab() {
  const [isListening, setIsListening] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-white mb-2">Voice Commands</h3>
        <p className="text-sm text-gray-400">
          Click the microphone and speak your commands
        </p>
      </div>

      <button
        onClick={() => setIsListening(!isListening)}
        className={cn(
          'relative w-24 h-24 rounded-full transition-all',
          isListening
            ? 'bg-primary-700 voice-active'
            : 'bg-surface-light hover:bg-surface-light/80'
        )}
      >
        <Mic className={cn(
          'w-10 h-10 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
          isListening ? 'text-white' : 'text-gray-400'
        )} />
      </button>

      <p className="text-sm text-gray-500 mt-6">
        {isListening ? 'Listening...' : 'Click to start'}
      </p>

      <div className="mt-8 w-full">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Try saying:</h4>
        <ul className="space-y-2 text-sm text-gray-500">
          <li>• "Add a hero section"</li>
          <li>• "Change the color to blue"</li>
          <li>• "Make it responsive"</li>
          <li>• "Add a contact form"</li>
        </ul>
      </div>
    </div>
  );
}
