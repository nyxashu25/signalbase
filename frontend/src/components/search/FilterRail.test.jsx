import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterRail } from './FilterRail.jsx';

function checkboxGroup(overrides = {}) {
  return {
    key: 'seniority',
    label: 'Seniority',
    type: 'checkbox',
    options: [
      { value: 'VP', count: 4 },
      { value: 'Director', count: 2 },
    ],
    selected: [],
    onToggle: vi.fn(),
    ...overrides,
  };
}

function textGroup(overrides = {}) {
  return {
    key: 'title',
    label: 'Job title',
    type: 'text',
    value: '',
    onChange: vi.fn(),
    placeholder: 'e.g. Finance manager',
    ...overrides,
  };
}

describe('FilterRail', () => {
  it('shows the total and every option of an expanded group', async () => {
    const user = userEvent.setup();
    render(<FilterRail groups={[checkboxGroup()]} total={196} />);
    expect(screen.getByText('196')).toBeInTheDocument();

    // Groups with no selection start collapsed.
    expect(screen.queryByText('VP')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand Seniority filter' }));
    expect(screen.getByText('VP')).toBeInTheDocument();
    expect(screen.getByText('Director')).toBeInTheDocument();
  });

  it('calls onToggle with the option value when a checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<FilterRail groups={[checkboxGroup({ onToggle })]} />);
    await user.click(screen.getByRole('button', { name: 'Expand Seniority filter' }));
    await user.click(screen.getByText('VP'));
    expect(onToggle).toHaveBeenCalledWith('VP');
  });

  it('opens a group with a selection by default, shows it as a chip, and clears it from the count pill', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<FilterRail groups={[checkboxGroup({ selected: ['VP'], onToggle })]} />);

    // Chip + checkbox label both render "VP"; the chip carries a remove button.
    expect(screen.getByRole('button', { name: 'Remove VP' })).toBeInTheDocument();
    expect(screen.getByText('Clear all 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear Seniority filter' }));
    expect(onToggle).toHaveBeenCalledWith('VP');
  });

  it('commits a text filter on Enter, not per keystroke', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilterRail groups={[textGroup({ onChange })]} />);
    await user.click(screen.getByRole('button', { name: 'Expand Job title filter' }));
    await user.type(screen.getByLabelText('Job title'), 'finance');
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('finance');
  });

  it('"Clear all" clears every group', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onChange = vi.fn();
    render(
      <FilterRail
        groups={[checkboxGroup({ selected: ['VP'], onToggle }), textGroup({ value: 'cfo', onChange })]}
      />,
    );
    await user.click(screen.getByText('Clear all 2'));
    expect(onToggle).toHaveBeenCalledWith('VP');
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('collapses long option lists behind "Show more"', async () => {
    const user = userEvent.setup();
    const options = Array.from({ length: 12 }, (_, i) => ({ value: `Opt ${i}`, count: 1 }));
    render(<FilterRail groups={[checkboxGroup({ options })]} />);
    await user.click(screen.getByRole('button', { name: 'Expand Seniority filter' }));
    expect(screen.getByText('Opt 7')).toBeInTheDocument();
    expect(screen.queryByText('Opt 8')).not.toBeInTheDocument();
    await user.click(screen.getByText('Show 4 more'));
    expect(screen.getByText('Opt 11')).toBeInTheDocument();
  });
});
