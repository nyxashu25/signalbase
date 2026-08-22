import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToListButton } from './AddToListButton.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

const existingLists = [
  { id: 'l1', name: 'Q1 targets', type: 'CONTACTS' },
  { id: 'l2', name: 'Enterprise accounts', type: 'COMPANIES' },
];

function setup(routes) {
  mockFetchRoutes(routes);
  return renderWithProviders(<AddToListButton type="CONTACTS" contactId="c1" />, {
    preloadedState: authenticatedState,
  });
}

describe('AddToListButton', () => {
  it('only offers lists matching the given type', async () => {
    const user = userEvent.setup();
    setup([{ url: /\/lists$/, respond: { body: { lists: existingLists } } }]);

    await user.click(screen.getByRole('button', { name: 'Add to list' }));
    expect(await screen.findByText('Q1 targets')).toBeInTheDocument();
    expect(screen.queryByText('Enterprise accounts')).not.toBeInTheDocument();
  });

  it('shows "No lists yet" when there are none of this type', async () => {
    const user = userEvent.setup();
    setup([{ url: /\/lists$/, respond: { body: { lists: [] } } }]);

    await user.click(screen.getByRole('button', { name: 'Add to list' }));
    expect(await screen.findByText('No lists yet')).toBeInTheDocument();
  });

  it('adds the contact to an existing list and marks it Added', async () => {
    const user = userEvent.setup();
    setup([
      { url: /\/lists$/, method: 'GET', respond: { body: { lists: existingLists } } },
      { url: '/lists/l1/items', method: 'POST', respond: { body: { ok: true } } },
    ]);

    await user.click(screen.getByRole('button', { name: 'Add to list' }));
    await user.click(await screen.findByText('Q1 targets'));
    await waitFor(() => expect(screen.getByText('Added')).toBeInTheDocument());
  });

  it('creates a new list and adds the contact to it', async () => {
    const user = userEvent.setup();
    setup([
      { url: /\/lists$/, method: 'GET', respond: { body: { lists: [] } } },
      {
        url: /\/lists$/,
        method: 'POST',
        respond: { body: { list: { id: 'l3', name: 'New list', type: 'CONTACTS' } } },
      },
      { url: '/lists/l3/items', method: 'POST', respond: { body: { ok: true } } },
    ]);

    await user.click(screen.getByRole('button', { name: 'Add to list' }));
    await user.type(await screen.findByPlaceholderText('New list name'), 'New list');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(screen.getByPlaceholderText('New list name')).toHaveValue(''));
  });
});
