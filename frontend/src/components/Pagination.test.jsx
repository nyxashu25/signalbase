import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination.jsx';

describe('Pagination', () => {
  it('shows the correct range for a middle page', () => {
    render(<Pagination page={2} pageSize={25} total={120} onPageChange={vi.fn()} />);
    expect(screen.getByText('26–50 of 120')).toBeInTheDocument();
  });

  it('clamps the end of the range to the total on the last page', () => {
    render(<Pagination page={5} pageSize={25} total={120} onPageChange={vi.fn()} />);
    expect(screen.getByText('101–120 of 120')).toBeInTheDocument();
  });

  it('shows 0 of 0 when there are no results', () => {
    render(<Pagination page={1} pageSize={25} total={0} onPageChange={vi.fn()} />);
    expect(screen.getByText('0–0 of 0')).toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last page', () => {
    render(<Pagination page={1} pageSize={25} total={30} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled();
  });

  it('calls onPageChange with the next page number', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={2} pageSize={25} total={120} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('jumps straight to a page from the page selector', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={1} pageSize={25} total={120} onPageChange={onPageChange} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Page' }), '4');
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('offers a rows-per-page control only when onPageSizeChange is given', async () => {
    const onPageSizeChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <Pagination page={1} pageSize={25} total={120} onPageChange={vi.fn()} />,
    );
    expect(screen.queryByRole('combobox', { name: 'Rows per page' })).not.toBeInTheDocument();

    rerender(
      <Pagination
        page={1}
        pageSize={25}
        total={120}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50');
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});
