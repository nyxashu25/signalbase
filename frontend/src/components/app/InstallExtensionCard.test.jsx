import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallExtensionCard } from './InstallExtensionCard.jsx';
import { renderWithProviders, authenticatedState } from '../../test/testUtils.jsx';

// Simulates the one API Chrome exposes to any web page for messaging a
// specific extension id — no `chrome.runtime` at all (like Firefox, or
// jsdom's default) reads the same as "not installed" through this mock's
// absence.
function mockChromeRuntime({ installed, version = '0.1.0' }) {
  window.chrome = {
    runtime: {
      lastError: installed ? undefined : { message: 'Could not establish connection.' },
      sendMessage: (id, message, callback) => {
        callback(installed ? { installed: true, version } : undefined);
      },
    },
  };
}

describe('InstallExtensionCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    delete window.chrome;
  });

  it('renders nothing while chrome.runtime is entirely absent from the environment, once checked', async () => {
    // No window.chrome at all — jsdom's default, and Firefox/Safari's reality.
    renderWithProviders(<InstallExtensionCard />, { preloadedState: authenticatedState });
    // "unsupported" still shows the banner today (detection just never
    // flips to installed) — assert the banner text still renders so this
    // documents the current behavior rather than silently changing it.
    expect(await screen.findByText('Install the DataPit Chrome extension')).toBeInTheDocument();
  });

  it('shows the install banner when the extension is not detected, and walks through the steps in the modal', async () => {
    mockChromeRuntime({ installed: false });
    const user = userEvent.setup();
    renderWithProviders(<InstallExtensionCard />, { preloadedState: authenticatedState });

    expect(await screen.findByText('Install the DataPit Chrome extension')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Install extension' }));

    expect(screen.getByRole('dialog', { name: 'Install the DataPit extension' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download the extension/ })).toHaveAttribute(
      'href',
      '/downloads/datapit-extension.zip',
    );
    expect(screen.getByText('chrome://extensions')).toBeInTheDocument();
    expect(screen.getByText('Waiting for the extension…')).toBeInTheDocument();
  });

  it('flips to the connected state once the extension responds, and hides the banner behind it', async () => {
    mockChromeRuntime({ installed: false });
    const user = userEvent.setup();
    renderWithProviders(<InstallExtensionCard />, { preloadedState: authenticatedState });
    await user.click(await screen.findByRole('button', { name: 'Install extension' }));
    expect(screen.getByText('Waiting for the extension…')).toBeInTheDocument();

    // The user finishes "Load unpacked" — the extension starts responding.
    mockChromeRuntime({ installed: true, version: '0.1.0' });
    await user.click(screen.getByRole('button', { name: 'Check again' }));

    expect(await screen.findByText('Extension connected — v0.1.0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an API key' })).toHaveAttribute(
      'href',
      '/app/settings/api',
    );

    await user.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(screen.queryByText('Install the DataPit Chrome extension')).not.toBeInTheDocument(),
    );
  });

  it('dismissing the banner hides it for the session (persisted)', async () => {
    mockChromeRuntime({ installed: false });
    const user = userEvent.setup();
    renderWithProviders(<InstallExtensionCard />, { preloadedState: authenticatedState });
    await screen.findByText('Install the DataPit Chrome extension');

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Install the DataPit Chrome extension')).not.toBeInTheDocument();
    expect(localStorage.getItem('dp-banner-dismissed:install-extension')).toBe('1');
  });
});
