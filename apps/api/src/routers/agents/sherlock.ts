// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENT SHERLOCK (CLONER)
// ==============================================

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, aiProcedure, masterAdminProcedure } from '../../lib/trpc';
import { prisma, AgentName } from '@plugspace/database';
import { AGENT_CONFIG } from '@plugspace/utils';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

const SHERLOCK_SYSTEM_PROMPT = `You are Sherlock, the Website Analyzer AI agent for Plugspace.io Titan. Your role is to analyze websites and extract their design patterns, structure, and content.

When given a website URL or HTML content, analyze and extract:
1. Color scheme and palette
2. Typography (fonts, sizes)
3. Layout structure
4. Navigation patterns
5. Key sections and components
6. Design style and aesthetic

Output as JSON:
{
  "analysis": {
    "colors": ["#hex1", "#hex2", ...],
    "fonts": ["Font1", "Font2"],
    "layout": "description",
    "style": "modern/minimal/bold/etc"
  },
  "structure": {
    "navigation": [...],
    "sections": [...],
    "footer": {...}
  },
  "components": [
    { "type": "hero", "description": "..." },
    ...
  ],
  "recommendations": [...]
}`;

export const sherlockRouter = router({
  // Analyze website URL
  analyzeUrl: aiProcedure
    .input(
      z.object({
        url: z.string().url(),
        extractHtml: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();

      if (ctx.user.creditsRemaining <= 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits.',
        });
      }

      try {
        // Fetch website content
        const response = await fetch(input.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Plugspace/1.4; +https://plugspace.io)',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status}`);
        }

        const html = await response.text();

        // Use Gemini for analysis
        const model = genAI.getGenerativeModel({ model: AGENT_CONFIG.SHERLOCK.model });

        const prompt = `${SHERLOCK_SYSTEM_PROMPT}\n\nAnalyze this website HTML and extract the design system, structure, and components:\n\n${html.substring(0, 30000)}`;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();

        let analysis;
        try {
          const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
            textResponse.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textResponse;
          analysis = JSON.parse(jsonStr);
        } catch {
          analysis = { raw: textResponse };
        }

        const latencyMs = Date.now() - startTime;

        // Deduct credits
        await prisma.user.update({
          where: { id: ctx.user.id },
          data: { creditsRemaining: { decrement: 2 } },
        });

        return {
          success: true,
          url: input.url,
          analysis,
          html: input.extractHtml ? html : undefined,
          metrics: { latencyMs },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to analyze website',
          cause: error,
        });
      }
    }),

  // Clone website to project
  cloneToProject: aiProcedure
    .input(
      z.object({
        projectId: z.string(),
        url: z.string().url(),
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

      if (ctx.user.creditsRemaining < 5) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits. Cloning requires 5 credits.',
        });
      }

      try {
        // Fetch website
        const response = await fetch(input.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Plugspace/1.4; +https://plugspace.io)',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status}`);
        }

        const html = await response.text();

        // Analyze with Gemini
        const model = genAI.getGenerativeModel({ model: AGENT_CONFIG.SHERLOCK.model });

        const analysisPrompt = `${SHERLOCK_SYSTEM_PROMPT}\n\nAnalyze this website for cloning:\n\n${html.substring(0, 30000)}`;
        const analysisResult = await model.generateContent(analysisPrompt);
        const analysisText = analysisResult.response.text();

        let cloneAnalysis;
        try {
          const jsonMatch = analysisText.match(/```json\n?([\s\S]*?)\n?```/) ||
            analysisText.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : analysisText;
          cloneAnalysis = JSON.parse(jsonStr);
        } catch {
          cloneAnalysis = { raw: analysisText };
        }

        const latencyMs = Date.now() - startTime;

        // Log interaction
        await prisma.interactionLog.create({
          data: {
            projectId: input.projectId,
            userId: ctx.user.id,
            agentName: AgentName.SHERLOCK,
            agentModel: AGENT_CONFIG.SHERLOCK.model,
            input: input.url,
            output: cloneAnalysis,
            tokensUsed: 0, // Gemini doesn't provide token counts the same way
            latencyMs,
            cost: 0.01, // Estimated
            success: true,
          },
        });

        // Update project
        await prisma.project.update({
          where: { id: input.projectId },
          data: {
            clonedFrom: input.url,
            cloneAnalysis: {
              url: input.url,
              scrapedAt: new Date().toISOString(),
              ...cloneAnalysis,
            },
            // If analysis extracted design info, save it
            ...(cloneAnalysis.analysis && { design: cloneAnalysis.analysis }),
          },
        });

        // Deduct credits
        await prisma.user.update({
          where: { id: ctx.user.id },
          data: { creditsRemaining: { decrement: 5 } },
        });

        return {
          success: true,
          url: input.url,
          analysis: cloneAnalysis,
          metrics: { latencyMs },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clone website',
          cause: error,
        });
      }
    }),

  // Analyze image (screenshot/design)
  analyzeImage: aiProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        extractDesign: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();

      if (ctx.user.creditsRemaining < 2) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient credits.',
        });
      }

      try {
        // Fetch image
        const imageResponse = await fetch(input.imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

        // Use Gemini Vision
        const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

        const prompt = input.extractDesign
          ? 'Analyze this website/UI design image and extract: colors (hex values), fonts, layout structure, component types, and overall style. Output as JSON.'
          : 'Describe this image in detail, focusing on UI/UX elements if present.';

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ]);

        const textResponse = result.response.text();

        let analysis;
        try {
          const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
            textResponse.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textResponse;
          analysis = JSON.parse(jsonStr);
        } catch {
          analysis = { description: textResponse };
        }

        const latencyMs = Date.now() - startTime;

        // Deduct credits
        await prisma.user.update({
          where: { id: ctx.user.id },
          data: { creditsRemaining: { decrement: 2 } },
        });

        return {
          success: true,
          analysis,
          metrics: { latencyMs },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to analyze image',
          cause: error,
        });
      }
    }),

  // Extract HTML (admin only for now)
  extractHtml: masterAdminProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(input.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Plugspace/1.4; +https://plugspace.io)',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const html = await response.text();

        return {
          success: true,
          url: input.url,
          html,
          contentLength: html.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to extract HTML',
          cause: error,
        });
      }
    }),
});
