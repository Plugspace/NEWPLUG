// ==============================================
// PLUGSPACE.IO TITAN v1.4 - AGENTS ROUTER
// ==============================================

import { router } from '../../lib/trpc';
import { donRouter } from './don';
import { markRouter } from './mark';
import { jessicaRouter } from './jessica';
import { sherlockRouter } from './sherlock';
import { zaraRouter } from './zara';

export const agentRouter = router({
  don: donRouter,
  mark: markRouter,
  jessica: jessicaRouter,
  sherlock: sherlockRouter,
  zara: zaraRouter,
});

export type AgentRouter = typeof agentRouter;
