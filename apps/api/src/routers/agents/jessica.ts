// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENT JESSICA (DESIGNER)
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

const JESSICA_SYSTEM_PROMPT = `You are Jessica, the Design Specialist AI agent for Plugspace.io Titan. Your role is to create comprehensive design systems and UI specifications.

When given a project description or requirements, create a complete design system including:
1. Color palette (primary, secondary, accent, semantic colors)
2. Typography (font families, sizes, weights, line heights)
3. Spacing system
4. Component styles (buttons, inputs, cards, modals, navigation)
5. Animation definitions
6. Breakpoints

Always respond with valid JSON:
{
  "colorPalette": {
    "primary": { "50": "#...", "100": "#...", ..., "900": "#..." },
    "secondary": {...},
    "accent": {...},
    "neutral": {...},
    "success": "#...",
    "warning": "#...",
    "error": "#...",
    "info": "#...",
    "background": { "primary": "#...", "secondary": "#...", "tertiary": "#..." },
    "text": { "primary": "#...", "secondary": "#...", "muted": "#...", "inverse": "#..." }
  },
  "typography": {
    "fontFamily": { "heading": "...", "body": "...", "mono": "..." },
    "fontSize": { "xs": "...", "sm": "...", ..., "5xl": "..." },
    "fontWeight": { "light": 300, "normal": 400, ..., "bold": 700 },
    "lineHeight": { "tight": "1.25", "normal": "1.5", "relaxed": "1.75" }
  },
  "spacing": { "unit": 4, "scale": { "0": "0", "1": "4px", ..., "16": "64px" } },
  "components": {
    "button": { "borderRadius": "...", "padding": {...}, "variants": {...} },
    "input": {...},
    "card": {...},
    "modal": {...},
    "navigation": {...}
  },
  "animations": {
    "duration": { "fast": "150ms", "normal": "300ms", "slow": "500ms" },
    "easing": { "default": "...", "in": "...", "out": "...", "inOut": "..." }
  },
  "breakpoints": { "sm": "640px", "md": "768px", "lg": "1024px", "xl": "1280px", "2xl": "1536px" }
}

Create beautiful, modern, accessible designs.`;

export const jessicaRouter = router({
  // Generate design system
  generateDesign: aiProcedure
    .input(
      z.object({
        projectId: z.string(),
        prompt: z.string().min(10).max(3000),
        style: z.enum(['modern', 'minimal', 'bold', 'elegant', 'playful', 'corporate']).optional(),
        industry: z.string().optional(),
        brandColors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).optional(),
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

      if (ctx.user.creditsRemaining <= 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits.',
        });
      }

      try {
        let prompt = `Create a design system for: ${input.prompt}`;
        
        if (input.style) {
          prompt += `\nStyle preference: ${input.style}`;
        }
        if (input.industry) {
          prompt += `\nIndustry: ${input.industry}`;
        }
        if (input.brandColors?.length) {
          prompt += `\nBrand colors to incorporate: ${input.brandColors.join(', ')}`;
        }
        if (project.architecture) {
          prompt += `\nProject architecture context: ${JSON.stringify(project.architecture).substring(0, 1000)}`;
        }

        const response = await anthropic.messages.create({
          model: AGENT_CONFIG.JESSICA.model,
          max_tokens: AGENT_CONFIG.JESSICA.maxTokens,
          temperature: AGENT_CONFIG.JESSICA.temperature,
          system: JESSICA_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        });

        const latencyMs = Date.now() - startTime;
        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from AI');
        }

        let design;
        try {
          const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/) ||
            textContent.text.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textContent.text;
          design = JSON.parse(jsonStr);
        } catch {
          design = { raw: textContent.text };
        }

        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;
        const cost = (inputTokens * 0.003 + outputTokens * 0.015) / 1000;

        // Log interaction
        await prisma.interactionLog.create({
          data: {
            projectId: input.projectId,
            userId: ctx.user.id,
            agentName: AgentName.JESSICA,
            agentModel: AGENT_CONFIG.JESSICA.model,
            input: prompt,
            output: design,
            tokensUsed: inputTokens + outputTokens,
            latencyMs,
            cost,
            success: true,
          },
        });

        // Update project with design
        await prisma.project.update({
          where: { id: input.projectId },
          data: { design },
        });

        // Deduct credits
        await prisma.user.update({
          where: { id: ctx.user.id },
          data: { creditsRemaining: { decrement: 1 } },
        });

        return {
          success: true,
          design,
          metrics: { latencyMs, tokensUsed: inputTokens + outputTokens, cost },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate design',
          cause: error,
        });
      }
    }),

  // Generate color palette
  generatePalette: aiProcedure
    .input(
      z.object({
        baseColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        mood: z.string().optional(),
        industry: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        let prompt = 'Generate a beautiful, cohesive color palette';
        if (input.baseColor) {
          prompt += ` based on the color ${input.baseColor}`;
        }
        if (input.mood) {
          prompt += ` with a ${input.mood} mood`;
        }
        if (input.industry) {
          prompt += ` for the ${input.industry} industry`;
        }
        prompt += '. Return as JSON with primary, secondary, accent color scales (50-900), plus success, warning, error, info colors.';

        const response = await anthropic.messages.create({
          model: AGENT_CONFIG.JESSICA.model,
          max_tokens: 2048,
          temperature: 0.8,
          messages: [{ role: 'user', content: prompt }],
        });

        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from AI');
        }

        let palette;
        try {
          const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/) ||
            textContent.text.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textContent.text;
          palette = JSON.parse(jsonStr);
        } catch {
          palette = { raw: textContent.text };
        }

        return { success: true, palette };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate palette',
          cause: error,
        });
      }
    }),

  // Generate component design
  designComponent: aiProcedure
    .input(
      z.object({
        projectId: z.string(),
        componentType: z.enum([
          'button',
          'input',
          'card',
          'modal',
          'navigation',
          'hero',
          'footer',
          'form',
          'table',
          'dropdown',
        ]),
        variant: z.string().optional(),
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

      try {
        let prompt = `Design a ${input.componentType} component`;
        if (input.variant) {
          prompt += ` with ${input.variant} variant`;
        }
        if (project.design) {
          prompt += `\nUsing this design system: ${JSON.stringify(project.design).substring(0, 2000)}`;
        }
        prompt += '\nReturn detailed CSS/Tailwind styles as JSON.';

        const response = await anthropic.messages.create({
          model: AGENT_CONFIG.JESSICA.model,
          max_tokens: 2048,
          temperature: 0.6,
          messages: [{ role: 'user', content: prompt }],
        });

        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text response from AI');
        }

        let componentDesign;
        try {
          const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/) ||
            textContent.text.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textContent.text;
          componentDesign = JSON.parse(jsonStr);
        } catch {
          componentDesign = { raw: textContent.text };
        }

        return {
          success: true,
          componentType: input.componentType,
          design: componentDesign,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to design component',
          cause: error,
        });
      }
    }),
});
