import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Unsubscribe } from './Unsubscribe.jsx';
import { renderWithProviders, mockFetchRoutes } from '../test/testUtils.jsx';

describe('Unsubscribe', () => {
  it('confirms once the unsubscribe call succeeds', async () => {
    mockFetchRoutes([
      {
        url: '/notifications/unsubscribe',
        method: 'POST',
        respond: { body: { unsubscribed: true } },
      },
    ]);

    renderWithProviders(<Unsubscribe />, { route: '/unsubscribe?token=good-token' });

    expect(
      await screen.findByText(/unsubscribed from DataPit promotional emails/i),
    ).toBeInTheDocument();
  });

  it('shows an error for an invalid token', async () => {
    mockFetchRoutes([
      {
        url: '/notifications/unsubscribe',
        method: 'POST',
        respond: { status: 400, body: { error: { message: 'Invalid unsubscribe link' } } },
      },
    ]);

    renderWithProviders(<Unsubscribe />, { route: '/unsubscribe?token=bad-token' });

    expect(await screen.findByText('Invalid unsubscribe link')).toBeInTheDocument();
  });

  it('shows a missing-link message with no token at all', () => {
    renderWithProviders(<Unsubscribe />, { route: '/unsubscribe' });

    expect(screen.getByText('Missing unsubscribe link.')).toBeInTheDocument();
  });
});
