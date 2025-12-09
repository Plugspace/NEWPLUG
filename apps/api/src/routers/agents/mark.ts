// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENT MARK (DEVELOPER)
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

const MARK_SYSTEM_PROMPT = `You are Mark, the Code Developer AI agent for Plugspace.io Titan. Your role is to write production-ready code based on architecture specifications.

When given an architecture and requirements, you must output complete, working code files. Follow these guidelines:
1. Write clean, well-documented TypeScript/React code
2. Follow best practices and design patterns
3. Include proper error handling
4. Use Tailwind CSS for styling
5. Implement responsive designs
6. Add proper TypeScript types

Always respond with valid JSON containing the code files:
{
  "files": {
    "src/components/ComponentName.tsx": "// code here...",
    "src/pages/PageName.tsx": "// code here...",
    ...
  },
  "dependencies": {
    "package-name": "^version"
  },
  "instructions": "Optional setup instructions"
}

Write production-quality code that is ready to deploy.`;

export const markRouter = router({
  // Generate code from architecture
  generateCode: aiProcedure
    .input(
      z.object({
        projectId: z.string(),
        prompt: z.string().optional(),
        files: z.array(z.string()).optional(), // Specific files to generate
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();

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
          message: 'Project has no architecture. Generate architecture first.',
        });
      }

      if (ctx.user.creditsRemaining <= 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits.',
        });
      }

      try {
        let prompt = `Generate code based on this architecture:\n${JSON.stringify(project.architecture, null, 2)}`;
        
        if (project.design) {
          prompt += `\n\nDesign system:\n${JSON.stringify(project.design, null, 2)}`;
        }

        if (input.prompt) {
          prompt += `\n\nAdditional requirements: ${input.prompt}`;
        }

        if (input.files?.length) {
          prompt += `\n\nGenerate only these files: ${input.files.join(', ')}`;
        }

        const response = await anthropic.messages.create({
          model: AGENT_CONFIG.MARK.model,
          max_tokens: AGENT_CONFIG.MARK.maxTokens,
          temperature: AGENT_CONFIG.MARK.temperature,
          system: MARK_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        });

        const latencyMs = Date.now() - startTime;
        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from AI');
        }

        let codeOutput;
        try {
          const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/) ||
            textContent.text.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textContent.text;
          codeOutput = JSON.parse(jsonStr);
        } catch {
          codeOutput = { raw: textContent.text };
        }

        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;
        const cost = (inputTokens * 0.003 + outputTokens * 0.015) / 1000;

        // Log interaction
        await prisma.interactionLog.create({
          data: {
            projectId: input.projectId,
            userId: ctx.user.id,
            agentName: AgentName.MARK,
            agentModel: AGENT_CONFIG.MARK.model,
            input: prompt.substring(0, 5000),
            output: codeOutput,
            tokensUsed: inputTokens + outputTokens,
            latencyMs,
            cost,
            success: true,
          },
        });

        // Update project with code
        const existingFiles = (project.codeFiles as Record<string, string>) || {};
        const newFiles = codeOutput.files || {};
        
        await prisma.project.update({
          where: { id: input.projectId },
          data: {
            codeFiles: { ...existingFiles, ...newFiles },
            dependencies: codeOutput.dependencies || project.dependencies,
          },
        });

        // Deduct credits
        await prisma.user.update({
          where: { id: ctx.user.id },
          data: { creditsRemaining: { decrement: 2 } }, // Code generation costs 2 credits
        });

        return {
          success: true,
          files: newFiles,
          dependencies: codeOutput.dependencies,
          instructions: codeOutput.instructions,
          metrics: { latencyMs, tokensUsed: inputTokens + outputTokens, cost },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate code',
          cause: error,
        });
      }
    }),

  // Edit specific file
  editFile: aiProcedure
    .input(
      z.object({
        projectId: z.string(),
        filePath: z.string(),
        instruction: z.string().min(10).max(2000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();

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

      const codeFiles = (project.codeFiles as Record<string, string>) || {};
      const currentCode = codeFiles[input.filePath];

      if (!currentCode) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found in project',
        });
      }

      try {
        const prompt = `Current file (${input.filePath}):\n\`\`\`\n${currentCode}\n\`\`\`\n\nInstruction: ${input.instruction}\n\nProvide the complete updated file content as JSON: {"file": "updated code here"}`;

        const response = await anthropic.messages.create({
          model: AGENT_CONFIG.MARK.model,
          max_tokens: AGENT_CONFIG.MARK.maxTokens,
          temperature: 0.2, // Lower temperature for edits
          system: 'You are Mark, a code editing AI. When given code and instructions, output the complete updated file as JSON: {"file": "..."}. Maintain the existing code style.',
          messages: [{ role: 'user', content: prompt }],
        });

        const latencyMs = Date.now() - startTime;
        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from AI');
        }

        let result;
        try {
          const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/) ||
            textContent.text.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textContent.text;
          result = JSON.parse(jsonStr);
        } catch {
          result = { file: textContent.text };
        }

        // Update the file
        codeFiles[input.filePath] = result.file;

        await prisma.project.update({
          where: { id: input.projectId },
          data: { codeFiles },
        });

        return {
          success: true,
          filePath: input.filePath,
          content: result.file,
          metrics: { latencyMs },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to edit file',
          cause: error,
        });
      }
    }),

  // Generate component
  generateComponent: aiProcedure
    .input(
      z.object({
        projectId: z.string(),
        componentName: z.string(),
        description: z.string(),
        props: z.array(z.object({
          name: z.string(),
          type: z.string(),
          required: z.boolean().default(true),
        })).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();

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

      try {
        let prompt = `Create a React component called "${input.componentName}".\nDescription: ${input.description}`;
        
        if (input.props?.length) {
          prompt += `\nProps: ${JSON.stringify(input.props)}`;
        }

        if (project.design) {
          prompt += `\nDesign system: ${JSON.stringify(project.design)}`;
        }

        prompt += '\n\nOutput as JSON: {"component": "full component code", "styles": "optional styles if not using Tailwind"}';

        const response = await anthropic.messages.create({
          model: AGENT_CONFIG.MARK.model,
          max_tokens: 4096,
          temperature: 0.3,
          system: MARK_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        });

        const latencyMs = Date.now() - startTime;
        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from AI');
        }

        let result;
        try {
          const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/) ||
            textContent.text.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textContent.text;
          result = JSON.parse(jsonStr);
        } catch {
          result = { component: textContent.text };
        }

        // Add component to project
        const codeFiles = (project.codeFiles as Record<string, string>) || {};
        const filePath = `src/components/${input.componentName}.tsx`;
        codeFiles[filePath] = result.component;

        await prisma.project.update({
          where: { id: input.projectId },
          data: { codeFiles },
        });

        return {
          success: true,
          filePath,
          component: result.component,
          styles: result.styles,
          metrics: { latencyMs },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate component',
          cause: error,
        });
      }
    }),
});
