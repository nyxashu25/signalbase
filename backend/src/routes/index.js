import { Router } from 'express';
import { authRouter } from './auth.js';
import { listsRouter } from './lists.js';
import { searchRouter } from './search.js';
import { contactsRouter } from './contacts.js';
import { sequencesRouter } from './sequences.js';
import { webhooksRouter } from './webhooks.js';
import { billingRouter } from './billing.js';
import { privacyRouter } from './privacy.js';
import { adminRouter } from './admin.js';
import { contactRouter } from './contact.js';

export const apiRouter = Router();

apiRouter.get('/', (req, res) => {
  res.json({ name: 'DataPit API', version: 'v1' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/lists', listsRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/contacts', contactsRouter);
apiRouter.use('/sequences', sequencesRouter);
apiRouter.use('/webhooks', webhooksRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/privacy', privacyRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/contact', contactRouter);

// CRM sync (Salesforce/HubSpot) and the Chrome extension are P2 / out of
// scope here — CRM sync needs a real sandbox to integrate against, and the
// extension is a separate browser-extension project, not an API route.

// Remaining resource routers (billing...) mount here as they're built in
// later phases.
