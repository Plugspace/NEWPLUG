// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENT DON (ARCHITECT)
// ==============================================

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, aiProcedure } from '../../lib/trpc';
import { prisma, AgentName } from '@plugspace/database';
import { AGENT_CONFIG } from '@plugspace/utils';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const DON_SYSTEM_PROMPT = `You are Don, the Project Architect AI agent for Plugspace.io Titan. Your role is to design comprehensive project architectures based on user requirements.

When given a project description, you must output a complete architecture specification including:
1. Project structure (directories and files)
2. Technology stack recommendations
3. Route definitions
4. Component hierarchy
5. Data models
6. API endpoint specifications

Always respond with valid JSON following this exact structure:
{
  "projectStructure": {
    "directories": ["src/", "src/components/", ...],
    "files": [{ "path": "...", "type": "...", "description": "..." }, ...]
  },
  "techStack": {
    "frontend": [...],
    "backend": [...],
    "database": [...],
    "services": [...]
  },
  "routes": [{ "path": "...", "component": "...", "protected": boolean, "metadata": {...} }, ...],
  "components": [{ "name": "...", "type": "...", "props": [...], "dependencies": [...] }, ...],
  "dataModels": [{ "name": "...", "fields": [...], "relations": [...] }, ...],
  "apiEndpoints": [{ "method": "...", "path": "...", "handler": "...", "auth": boolean }, ...]
}

Be precise, professional, and always consider scalability, maintainability, and best practices.`;

export const donRouter = router({
  // Generate project architecture
  generateArchitecture: aiProcedure
    .input(
      z.object({
        projectId: z.string(),
        prompt: z.string().min(10).max(5000),
        context: z
          .object({
            industry: z.string().optional(),
            style: z.string().optional(),
            features: z.array(z.string()).optional(),
            targetAudience: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();

      // Verify project exists and belongs to user's org
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          organizationId: ctx.organization.id,
          deletedAt: null,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Check credits
      if (ctx.user.creditsRemaining <= 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits. Please upgrade your plan.',
        });
      }

      try {
        // Build the prompt with context
        let fullPrompt = `Project Request: ${input.prompt}`;
        if (input.context) {
          if (input.context.industry) {
            fullPrompt += `\nIndustry: ${input.context.industry}`;
          }
          if (input.context.style) {
            fullPrompt += `\nStyle: ${input.context.style}`;
          }
          if (input.context.features?.length) {
            fullPrompt += `\nRequired Features: ${input.context.features.join(', ')}`;
          }
          if (input.context.targetAudience) {
            fullPrompt += `\nTarget Audience: ${input.context.targetAudience}`;
          }
        }

        // Call Claude API
        const response = await anthropic.messages.create({
          model: AGENT_CONFIG.DON.model,
          max_tokens: AGENT_CONFIG.DON.maxTokens,
          temperature: AGENT_CONFIG.DON.temperature,
          system: DON_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: fullPrompt,
            },
          ],
        });

        const latencyMs = Date.now() - startTime;

        // Extract text content
        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from AI');
        }

        // Parse the JSON response
        let architecture;
        try {
          // Extract JSON from the response (might be wrapped in markdown code blocks)
          const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/) ||
            textContent.text.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textContent.text;
          architecture = JSON.parse(jsonStr);
        } catch {
          // If parsing fails, return raw response
          architecture = { raw: textContent.text };
        }

        // Calculate cost (approximate)
        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;
        const cost = (inputTokens * 0.003 + outputTokens * 0.015) / 1000;

        // Log interaction
        await prisma.interactionLog.create({
          data: {
            projectId: input.projectId,
            userId: ctx.user.id,
            agentName: AgentName.DON,
            agentModel: AGENT_CONFIG.DON.model,
            input: fullPrompt,
            output: architecture,
            tokensUsed: inputTokens + outputTokens,
            latencyMs,
            cost,
            success: true,
          },
        });

        // Update project with architecture
        await prisma.project.update({
          where: { id: input.projectId },
          data: { architecture },
        });

        // Deduct credits
        await prisma.user.update({
          where: { id: ctx.user.id },
          data: { creditsRemaining: { decrement: 1 } },
        });

        return {
          success: true,
          architecture,
          metrics: {
            latencyMs,
            tokensUsed: inputTokens + outputTokens,
            cost,
          },
        };
      } catch (error) {
        const latencyMs = Date.now() - startTime;

        // Log failed interaction
        await prisma.interactionLog.create({
          data: {
            projectId: input.projectId,
            userId: ctx.user.id,
            agentName: AgentName.DON,
            agentModel: AGENT_CONFIG.DON.model,
            input: input.prompt,
            output: {},
            tokensUsed: 0,
            latencyMs,
            cost: 0,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate architecture',
          cause: error,
        });
      }
    }),

  // Refine existing architecture
  refineArchitecture: aiProcedure
    .input(
      z.object({
        projectId: z.string(),
        feedback: z.string().min(10).max(2000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          organizationId: ctx.organization.id,
          deletedAt: null,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (!project.architecture) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No existing architecture to refine',
        });
      }

      const startTime = Date.now();

      try {
        const response = await anthropic.messages.create({
          model: AGENT_CONFIG.DON.model,
          max_tokens: AGENT_CONFIG.DON.maxTokens,
          temperature: AGENT_CONFIG.DON.temperature,
          system: DON_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Current architecture:\n${JSON.stringify(project.architecture, null, 2)}\n\nPlease refine based on this feedback: ${input.feedback}`,
            },
          ],
        });

        const latencyMs = Date.now() - startTime;
        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from AI');
        }

        let architecture;
        try {
          const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/) ||
            textContent.text.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textContent.text;
          architecture = JSON.parse(jsonStr);
        } catch {
          architecture = { raw: textContent.text };
        }

        await prisma.project.update({
          where: { id: input.projectId },
          data: { architecture },
        });

        return {
          success: true,
          architecture,
          metrics: { latencyMs },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to refine architecture',
          cause: error,
        });
      }
    }),
});
