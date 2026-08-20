import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Login } from './Login.jsx';
import { renderWithProviders } from '../test/testUtils.jsx';

describe('Login', () => {
  it('defaults to sign-in mode at /login', () => {
    renderWithProviders(<Login />, { route: '/login' });

    expect(screen.getByText('Sign in to your workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Workspace / org name')).not.toBeInTheDocument();
  });

  it('opens straight into create-workspace mode at /login?mode=register', () => {
    renderWithProviders(<Login />, { route: '/login?mode=register' });

    expect(screen.getByText('Create a new workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Workspace / org name')).toBeInTheDocument();
  });
});
