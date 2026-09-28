import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FadeIn } from '../components/marketing/motion.jsx';
import { beginPrerenderHandoff, endPrerenderHandoff, isPrerenderHandoff } from './handoff.js';

afterEach(() => endPrerenderHandoff());

describe('prerender handoff', () => {
  it('is off in the browser until main.jsx finds prerendered markup', () => {
    expect(isPrerenderHandoff()).toBe(false);
    beginPrerenderHandoff();
    expect(isPrerenderHandoff()).toBe(true);
  });

  it('lets a mount-time fade start settled over prerendered HTML', () => {
    beginPrerenderHandoff();
    render(<FadeIn whileInView={false}>Hero copy</FadeIn>);
    expect(screen.getByText('Hero copy').style.opacity).toBe('1');
  });

  it('keeps the entrance on ordinary client renders', () => {
    render(<FadeIn whileInView={false}>Hero copy</FadeIn>);
    expect(screen.getByText('Hero copy').style.opacity).toBe('0');
  });
});
