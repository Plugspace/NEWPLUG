// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENT ZARA (VOICE ASSISTANT)
// ==============================================

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, aiProcedure } from '../../lib/trpc';
import { prisma, AgentName } from '@plugspace/database';
import { AGENT_CONFIG } from '@plugspace/utils';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

const ZARA_SYSTEM_PROMPT = `You are Zara, the Voice Assistant AI for Plugspace.io Titan - a voice-first website building platform. Your role is to understand natural language commands and translate them into actions.

You help users:
1. Navigate the platform
2. Create and edit projects
3. Select templates
4. Modify designs
5. Add/edit components
6. Publish websites

When given a voice command, analyze intent and respond with:
{
  "understood": true/false,
  "intent": "navigate|create|edit|delete|select|search|publish|help|unknown",
  "action": {
    "type": "specific_action_type",
    "target": "what to act on",
    "params": { ... }
  },
  "response": "Natural language response to user",
  "suggestions": ["optional follow-up suggestions"]
}

Be helpful, concise, and friendly. Guide users through the platform naturally.`;

export const zaraRouter = router({
  // Process voice command
  processCommand: aiProcedure
    .input(
      z.object({
        transcript: z.string().min(1).max(1000),
        context: z
          .object({
            currentPage: z.string().optional(),
            projectId: z.string().optional(),
            selectedComponent: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();

      try {
        const model = genAI.getGenerativeModel({ model: AGENT_CONFIG.ZARA.model });

        let prompt = `${ZARA_SYSTEM_PROMPT}\n\nUser voice command: "${input.transcript}"`;
        
        if (input.context) {
          prompt += `\n\nContext:`;
          if (input.context.currentPage) {
            prompt += `\n- Current page: ${input.context.currentPage}`;
          }
          if (input.context.projectId) {
            prompt += `\n- Working on project ID: ${input.context.projectId}`;
          }
          if (input.context.selectedComponent) {
            prompt += `\n- Selected component: ${input.context.selectedComponent}`;
          }
        }

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();

        let response;
        try {
          const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
            textResponse.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textResponse;
          response = JSON.parse(jsonStr);
        } catch {
          response = {
            understood: true,
            intent: 'unknown',
            action: null,
            response: textResponse,
            suggestions: [],
          };
        }

        const latencyMs = Date.now() - startTime;

        // Log if there's a project context
        if (input.context?.projectId) {
          await prisma.interactionLog.create({
            data: {
              projectId: input.context.projectId,
              userId: ctx.user.id,
              agentName: AgentName.ZARA,
              agentModel: AGENT_CONFIG.ZARA.model,
              input: input.transcript,
              output: response,
              tokensUsed: 0,
              latencyMs,
              cost: 0,
              success: response.understood,
            },
          });
        }

        return {
          success: true,
          ...response,
          metrics: { latencyMs },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process voice command',
          cause: error,
        });
      }
    }),

  // Get suggested commands
  getSuggestions: aiProcedure
    .input(
      z.object({
        context: z.enum(['landing', 'studio', 'admin', 'publish']),
        partial: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const suggestions: Record<string, string[]> = {
        landing: [
          'Show me fashion templates',
          'Search for restaurant websites',
          'Create a new project',
          'Show featured templates',
        ],
        studio: [
          'Add a hero section',
          'Change the primary color to blue',
          'Make the header sticky',
          'Add a contact form',
          'Preview on mobile',
          'Save my changes',
          'Undo last change',
        ],
        admin: [
          'Show user statistics',
          'View recent activity',
          'Create a new theme',
          'Check system health',
        ],
        publish: [
          'Publish my website',
          'Set up custom domain',
          'Enable SSL',
          'Preview before publishing',
        ],
      };

      let result = suggestions[input.context] || [];

      // Filter by partial input if provided
      if (input.partial) {
        const lower = input.partial.toLowerCase();
        result = result.filter((s) => s.toLowerCase().includes(lower));
      }

      return { suggestions: result.slice(0, 5) };
    }),

  // Convert text to speech (placeholder - would integrate with voice API)
  textToSpeech: aiProcedure
    .input(
      z.object({
        text: z.string().min(1).max(500),
        voice: z.enum(['female', 'male']).default('female'),
      })
    )
    .mutation(async ({ input }) => {
      // This would integrate with a TTS API like Google Cloud TTS
      // For now, return the text and let the client handle TTS
      return {
        success: true,
        text: input.text,
        audioUrl: null, // Would be the URL to the generated audio
        message: 'TTS integration pending - use browser speech synthesis',
      };
    }),

  // Handle conversation flow
  chat: aiProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(['user', 'assistant']),
              content: z.string(),
            })
          )
          .default([]),
        projectId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();

      try {
        const model = genAI.getGenerativeModel({ model: AGENT_CONFIG.ZARA.model });

        // Build conversation context
        const conversationContext = input.conversationHistory
          .map((msg) => `${msg.role === 'user' ? 'User' : 'Zara'}: ${msg.content}`)
          .join('\n');

        const prompt = `${ZARA_SYSTEM_PROMPT}\n\n${conversationContext ? `Previous conversation:\n${conversationContext}\n\n` : ''}User: ${input.message}\n\nRespond naturally and helpfully. If you can identify an action the user wants to take, include it in JSON format.`;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();

        // Try to extract action if present
        let action = null;
        let responseText = textResponse;
        
        try {
          const jsonMatch = textResponse.match(/\{[\s\S]*?\}/);
          if (jsonMatch) {
            action = JSON.parse(jsonMatch[0]);
            responseText = textResponse.replace(jsonMatch[0], '').trim();
          }
        } catch {
          // No action JSON found, that's okay
        }

        const latencyMs = Date.now() - startTime;

        // Log interaction if project context exists
        if (input.projectId) {
          await prisma.interactionLog.create({
            data: {
              projectId: input.projectId,
              userId: ctx.user.id,
              agentName: AgentName.ZARA,
              agentModel: AGENT_CONFIG.ZARA.model,
              input: input.message,
              output: { response: responseText, action },
              tokensUsed: 0,
              latencyMs,
              cost: 0,
              success: true,
            },
          });
        }

        return {
          success: true,
          response: responseText,
          action,
          metrics: { latencyMs },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process chat message',
          cause: error,
        });
      }
    }),
});
