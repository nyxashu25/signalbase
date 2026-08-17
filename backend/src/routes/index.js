import { Router } from 'express';

export const apiRouter = Router();

// Resource routers (auth, search, companies, contacts, lists, sequences,
// billing...) mount here as they're built in later phases.
apiRouter.get('/', (req, res) => {
  res.json({ name: 'SignalBase API', version: 'v1' });
});
