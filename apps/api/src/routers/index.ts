// ==============================================
// PLUGSPACE.IO TITAN v1.4 - MAIN ROUTER
// ==============================================

import { router } from '../lib/trpc';
import { authRouter } from './auth';
import { userRouter } from './user';
import { organizationRouter } from './organization';
import { projectRouter } from './project';
import { templateRouter } from './template';
import { agentRouter } from './agents';
import { adminRouter } from './admin';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  organization: organizationRouter,
  project: projectRouter,
  template: templateRouter,
  agent: agentRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
