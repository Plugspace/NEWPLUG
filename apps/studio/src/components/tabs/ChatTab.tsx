'use client';

import { useState } from 'react';
import { Send, Bot } from 'lucide-react';
import { Button, Input } from '@plugspace/ui';

export default function ChatTab() {
  const [messages, setMessages] = useState([
    {
      type: 'system' as const,
      content: 'AI Assistant is online. How can I help you build your website?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages([
      ...messages,
      {
        type: 'user' as const,
        content: input,
        timestamp: new Date().toISOString(),
      },
      {
        type: 'ai' as const,
        content: 'I understand. Let me help you with that...',
        agent: 'Don' as const,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Chat with AI</h3>
          <div className="flex items-center gap-2 text-sm text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.type === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-[#1e293b] text-white'
                  : message.type === 'ai'
                  ? 'bg-blue-600/20 border border-blue-600/30 text-white'
                  : 'bg-slate-800/50 text-[#94a3b8] text-sm'
              }`}
            >
              <p>{message.content}</p>
              {message.agent && (
                <p className="text-xs text-blue-400 mt-1">Agent: {message.agent}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800">
        <div className="mb-2">
          <label className="text-xs text-[#94a3b8] mb-1 block">
            Describe changes you want to make
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="E.g. 'Change the hero image...'"
            className="w-full px-3 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#8b5cf6] resize-none"
            rows={3}
          />
        </div>
        <Button
          onClick={handleSend}
          variant="indigo"
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          Send
        </Button>
      </div>
    </div>
  );
}
