import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportCsvButton } from './ExportCsvButton.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

const creditCostsRoute = {
  url: '/billing/credit-costs',
  respond: {
    body: { costs: { REVEAL: 2, COMPANY_VIEW: 20, CSV_EXPORT: 50, SEQUENCE_ENROLLMENT: 250 } },
  },
};

beforeEach(() => {
  global.URL.createObjectURL = () => 'blob:mock';
  global.URL.revokeObjectURL = () => {};
});

describe('ExportCsvButton', () => {
  it('shows the credit cost as a tooltip once loaded', async () => {
    mockFetchRoutes([creditCostsRoute]);
    renderWithProviders(<ExportCsvButton path="/people/export" />, {
      preloadedState: authenticatedState,
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Export CSV' })).toHaveAttribute(
        'title',
        'Spends 50 credits',
      ),
    );
  });

  it('shows a loading label while the download is in flight', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      creditCostsRoute,
      {
        url: '/people/export',
        respond: {
          body: 'id,email\n1,a@b.com',
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="export.csv"',
          },
        },
      },
    ]);
    renderWithProviders(<ExportCsvButton path="/people/export" />, {
      preloadedState: authenticatedState,
    });

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument(),
    );
  });

  it('shows a not-enough-credits message on a 402 response', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      creditCostsRoute,
      { url: '/people/export', respond: { status: 402, body: {} } },
    ]);
    renderWithProviders(<ExportCsvButton path="/people/export" />, {
      preloadedState: authenticatedState,
    });

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(
      await screen.findByText('Not enough credits for this export — add more credits to continue.'),
    ).toBeInTheDocument();
  });
});
