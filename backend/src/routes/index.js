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
import { toolsRouter } from './tools.js';
import { ticketsRouter } from './tickets.js';
import { notificationsRouter } from './notifications.js';
import { dashboardRouter } from './dashboard.js';
import { workspaceRouter } from './workspace.js';
import { apiKeysRouter } from './apiKeys.js';
import { extensionRouter } from './extension.js';

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
apiRouter.use('/tools', toolsRouter);
apiRouter.use('/tickets', ticketsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/workspace', workspaceRouter);
apiRouter.use('/api-keys', apiKeysRouter);
apiRouter.use('/extension', extensionRouter);

// CRM sync (Salesforce/HubSpot) is P2 / out of scope here — it needs a real
// sandbox to integrate against.

// Remaining resource routers (billing...) mount here as they're built in
// later phases.
