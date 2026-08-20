import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminExtendDatabase } from './AdminExtendDatabase.jsx';
import {
  renderWithProviders,
  authenticatedAdminState,
  mockFetchRoutes,
} from '../../test/testUtils.jsx';

const pendingBatch = {
  id: 'batch-1',
  filename: 'leads.csv',
  status: 'PENDING_APPROVAL',
  totalRows: 10,
  insertedCompanies: 3,
  insertedContacts: 8,
  errorCount: 2,
  errors: [{ row: 4, message: 'Missing First Name/Last Name' }],
  uploadedBy: { name: 'Root', email: 'root@datapit.io' },
  approvedBy: null,
  createdAt: '2026-08-20T10:00:00.000Z',
};

describe('AdminExtendDatabase', () => {
  it('shows an empty state when there are no imports yet', async () => {
    mockFetchRoutes([{ url: '/database-imports', method: 'GET', respond: { body: [] } }]);
    renderWithProviders(<AdminExtendDatabase />, { preloadedState: authenticatedAdminState });

    expect(await screen.findByText('No imports yet — upload a CSV to get started.')).toBeInTheDocument();
  });

  it('lists a pending batch with its counts and an expandable error list', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      { url: '/database-imports', method: 'GET', respond: { body: [pendingBatch] } },
    ]);
    renderWithProviders(<AdminExtendDatabase />, { preloadedState: authenticatedAdminState });

    expect(await screen.findByText('leads.csv')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve & publish' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /2/ }));
    expect(await screen.findByText(/Missing First Name\/Last Name/)).toBeInTheDocument();
  });

  it('approves a batch and reflects the published state after refetch', async () => {
    const user = userEvent.setup();
    let approved = false;
    mockFetchRoutes([
      {
        url: '/database-imports',
        method: 'GET',
        respond: () => ({
          body: approved
            ? [
                {
                  ...pendingBatch,
                  status: 'APPROVED',
                  errorCount: 0,
                  approvedBy: { name: 'Root', email: 'root@datapit.io' },
                },
              ]
            : [pendingBatch],
        }),
      },
      {
        url: '/database-imports/batch-1/approve',
        method: 'POST',
        respond: () => {
          approved = true;
          return { body: { ...pendingBatch, status: 'APPROVED' } };
        },
      },
    ]);
    renderWithProviders(<AdminExtendDatabase />, { preloadedState: authenticatedAdminState });

    await screen.findByText('Pending review');
    await user.click(screen.getByRole('button', { name: 'Approve & publish' }));

    await waitFor(() => expect(screen.getByText('Live')).toBeInTheDocument());
  });

  it('shows an error message when the upload fails', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      { url: '/database-imports', method: 'GET', respond: { body: [] } },
      {
        url: '/database-imports',
        method: 'POST',
        respond: { status: 400, body: { error: { message: 'CSV is missing required column(s): Domain' } } },
      },
    ]);
    renderWithProviders(<AdminExtendDatabase />, { preloadedState: authenticatedAdminState });
    await screen.findByText('No imports yet — upload a CSV to get started.');

    const file = new File(['a,b\n1,2'], 'bad.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]');
    await user.upload(input, file);
    await user.click(screen.getByRole('button', { name: 'Upload CSV' }));

    expect(
      await screen.findByText('CSV is missing required column(s): Domain'),
    ).toBeInTheDocument();
  });
});
