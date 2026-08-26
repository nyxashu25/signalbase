import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallExtensionCard } from './InstallExtensionCard.jsx';
import { renderWithProviders, authenticatedState } from '../../test/testUtils.jsx';

// The extension announces itself by marking <html> and firing an event (see
// extension/announce.js) — detection is id-independent. These helpers stand
// in for that content script.
function announceExtension(version = '0.4.0') {
  document.documentElement.setAttribute('data-datapit-extension', version);
  window.dispatchEvent(new CustomEvent('datapit-extension-ready', { detail: { version } }));
}
function removeExtension() {
  document.documentElement.removeAttribute('data-datapit-extension');
}

describe('InstallExtensionCard', () => {
  beforeEach(() => {
    localStorage.clear();
    removeExtension();
  });

  afterEach(() => {
    removeExtension();
  });

  it('shows the install banner when no extension has announced itself', async () => {
    renderWithProviders(<InstallExtensionCard />, { preloadedState: authenticatedState });
    expect(await screen.findByText('Install the DataPit Chrome extension')).toBeInTheDocument();
  });

  it('walks through the steps in the modal — Add to Chrome primary, .zip fallback', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InstallExtensionCard />, { preloadedState: authenticatedState });

    await user.click(await screen.findByRole('button', { name: 'Add to Chrome' }));

    expect(screen.getByRole('dialog', { name: 'Install the DataPit extension' })).toBeInTheDocument();
    // Primary: the store link.
    const store = screen.getByRole('link', { name: 'Add to Chrome' });
    expect(store).toHaveAttribute('href', expect.stringContaining('chromewebstore.google.com'));
    expect(store).toHaveAttribute('target', '_blank');
    // Fallback: the manual .zip.
    expect(screen.getByRole('link', { name: /Download the .zip/ })).toHaveAttribute(
      'href',
      '/downloads/datapit-extension.zip',
    );
    expect(screen.getByText('Waiting for the extension…')).toBeInTheDocument();
  });

  it('flips to the connected state when the extension announces, and hides the banner behind it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InstallExtensionCard />, { preloadedState: authenticatedState });
    await user.click(await screen.findByRole('button', { name: 'Add to Chrome' }));
    expect(screen.getByText('Waiting for the extension…')).toBeInTheDocument();

    // The user installs from the store and returns — the extension's
    // announce.js marks the page and fires its ready event.
    announceExtension('0.4.0');

    expect(await screen.findByText('Extension connected — v0.4.0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an API key' })).toHaveAttribute(
      'href',
      '/app/settings/api',
    );

    await user.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(screen.queryByText('Install the DataPit Chrome extension')).not.toBeInTheDocument(),
    );
  });

  it('never shows the banner when the extension is already present', async () => {
    announceExtension('0.4.0'); // present before the component mounts
    renderWithProviders(<InstallExtensionCard />, { preloadedState: authenticatedState });
    // Give the hook its grace window; the banner must never appear.
    await new Promise((r) => setTimeout(r, 500));
    expect(screen.queryByText('Install the DataPit Chrome extension')).not.toBeInTheDocument();
  });

  it('dismissing the banner hides it for the session (persisted)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InstallExtensionCard />, { preloadedState: authenticatedState });
    await screen.findByText('Install the DataPit Chrome extension');

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Install the DataPit Chrome extension')).not.toBeInTheDocument();
    expect(localStorage.getItem('dp-banner-dismissed:install-extension')).toBe('1');
  });
});
