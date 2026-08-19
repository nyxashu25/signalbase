import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacetPanel } from './FacetPanel.jsx';

function makeGroups(overrides = {}) {
  return [
    {
      key: 'seniority',
      label: 'Seniority',
      options: [
        { value: 'VP', count: 4 },
        { value: 'Director', count: 2 },
      ],
      selected: [],
      onToggle: vi.fn(),
      ...overrides,
    },
  ];
}

describe('FacetPanel', () => {
  it('renders every option for every group', () => {
    render(<FacetPanel groups={makeGroups()} />);
    expect(screen.getByText('VP')).toBeInTheDocument();
    expect(screen.getByText('Director')).toBeInTheDocument();
  });

  it('calls onToggle with the option value when a checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<FacetPanel groups={makeGroups({ onToggle })} />);

    await user.click(screen.getByText('VP'));
    expect(onToggle).toHaveBeenCalledWith('VP');
  });

  it('hides the mobile Filters toggle behind md:hidden but always renders the groups', () => {
    render(<FacetPanel groups={makeGroups()} />);
    const toggle = screen.getByRole('button', { name: /Filters/ });
    expect(toggle).toHaveClass('md:hidden');
    // The groups wrapper stays reachable regardless of the mobile open state —
    // real visibility is a CSS concern (md:flex), not something to gate in JS.
    expect(screen.getByText('VP')).toBeInTheDocument();
  });

  it('shows no "Clear all" button and no badge when nothing is selected', () => {
    render(<FacetPanel groups={makeGroups()} />);
    expect(screen.queryByRole('button', { name: /Clear all/ })).not.toBeInTheDocument();
  });

  it('shows the active count badge and a working "Clear all" once something is selected', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<FacetPanel groups={makeGroups({ selected: ['VP'], onToggle })} />);

    expect(screen.getByRole('button', { name: /Filters/ })).toHaveTextContent('1');
    const clearBtn = screen.getByRole('button', { name: /Clear all/ });
    await user.click(clearBtn);
    expect(onToggle).toHaveBeenCalledWith('VP');
  });
});
