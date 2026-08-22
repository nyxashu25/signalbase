import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { AdminAuditLog } from './AdminAuditLog.jsx';
import { renderWithProviders, authenticatedAdminState, mockFetchRoutes } from '../../test/testUtils.jsx';

describe('AdminAuditLog', () => {
  it('shows an empty state when nothing has been logged yet', async () => {
    mockFetchRoutes([
      {
        url: '/audit-log',
        method: 'GET',
        respond: { body: { results: [], total: 0, page: 1, pageSize: 50 } },
      },
    ]);

    renderWithProviders(<AdminAuditLog />, { preloadedState: authenticatedAdminState });

    expect(await screen.findByText('No admin actions recorded yet')).toBeInTheDocument();
  });

  it('renders each entry with its action, target, detail, and actor', async () => {
    mockFetchRoutes([
      {
        url: '/audit-log',
        method: 'GET',
        respond: {
          body: {
            results: [
              {
                id: 'a1',
                action: 'UPDATE_PLAN',
                metadata: { from: 'FREE', to: 'BASIC' },
                createdAt: '2026-08-22T10:00:00.000Z',
                superAdmin: { name: 'Root', email: 'root@datapit.io' },
                targetUser: { id: 'u1', name: 'Owner', email: 'owner@acme.test' },
              },
              {
                id: 'a2',
                action: 'ADD_CREDITS',
                metadata: { amount: 500 },
                createdAt: '2026-08-22T09:00:00.000Z',
                superAdmin: { name: 'Root', email: 'root@datapit.io' },
                targetUser: { id: 'u1', name: 'Owner', email: 'owner@acme.test' },
              },
            ],
            total: 2,
            page: 1,
            pageSize: 50,
          },
        },
      },
    ]);

    renderWithProviders(<AdminAuditLog />, { preloadedState: authenticatedAdminState });

    expect(await screen.findByText('Changed plan')).toBeInTheDocument();
    expect(screen.getByText('Added credits')).toBeInTheDocument();
    expect(screen.getByText('FREE → BASIC')).toBeInTheDocument();
    expect(screen.getByText('+500 credits')).toBeInTheDocument();
    expect(screen.getAllByText('owner@acme.test')).toHaveLength(2);
    expect(screen.getAllByText('root@datapit.io')).toHaveLength(2);
  });
});
