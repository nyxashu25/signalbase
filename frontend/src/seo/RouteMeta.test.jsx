import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Link } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { RouteMeta } from './RouteMeta.jsx';

const head = (selector) => document.head.querySelectorAll(selector);

describe('RouteMeta', () => {
  it('writes the page head and swaps it on navigation without duplicates', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/pricing']}>
        <RouteMeta />
        <Link to="/about">About</Link>
      </MemoryRouter>,
    );

    expect(document.title).toBe('DataPit Pricing: B2B Data Plans from $29 for 5 Seats');
    expect(head('link[rel="canonical"]')[0].getAttribute('href')).toBe(
      'https://datapit.io/pricing',
    );

    await user.click(document.querySelector('a'));

    expect(document.title).toBe('About DataPit: The B2B Contact Data Platform');
    expect(head('link[rel="canonical"]')).toHaveLength(1);
    expect(head('link[rel="canonical"]')[0].getAttribute('href')).toBe('https://datapit.io/about');
    expect(head('meta[name="description"]')).toHaveLength(1);
    expect(head('script[type="application/ld+json"]')).toHaveLength(1);
  });
});
