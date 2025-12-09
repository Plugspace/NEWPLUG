/**
 * Main tRPC router - aggregates all sub-routers
 */

import { router } from './trpc/trpc';
import { projectRouter } from './routers/project';
import { userRouter } from './routers/user';
import { templateRouter } from './routers/template';
import { themeRouter } from './routers/theme';
import { adminRouter } from './routers/admin';
import { agentRouter } from './routers/agent';
import { voiceRouter } from './routers/voice';

export const appRouter = router({
  project: projectRouter,
  user: userRouter,
  template: templateRouter,
  theme: themeRouter,
  admin: adminRouter,
  agent: agentRouter,
  voice: voiceRouter,
});

export type AppRouter = typeof appRouter;
