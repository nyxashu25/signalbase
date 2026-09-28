import { Fragment, isValidElement, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

/** Plain text of a React node tree — the screen-reader copy of a line. */
function plainText(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(plainText).join('');
  if (isValidElement(node)) return plainText(node.props.children);
  return '';
}

// Layout position of `el` inside `root`, summed along the offsetParent chain.
// Offsets ignore transforms, so a character mid-flip (rotateX, yPercent) or a
// headline mid-parallax measures where it will rest, not where it is drawn.
function offsetWithin(el, root) {
  let x = 0;
  let y = 0;
  for (let node = el; node; node = node.offsetParent) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  for (let node = root; node; node = node.offsetParent) {
    x -= node.offsetLeft;
    y -= node.offsetTop;
  }
  return { x, y };
}

// `bg-clip-text` gradient spans (the brand-gradient words in the covers)
// can't survive a character split: the parent's background is clipped to
// its own text, and once each character is a transformed inline-block that
// text no longer paints in the parent's layer — the glyphs would vanish.
// So each character carries its own slice of the parent's gradient: the
// gradient box is the union of the parent's characters, measured in the
// line block's layout space, and each slice is offset to where its character
// sits in that box. The parent's own background steps aside while split.
function paintGradientSlices(root, sourceImages) {
  root.querySelectorAll('[data-line] .bg-clip-text').forEach((parent) => {
    if (!sourceImages.has(parent)) {
      sourceImages.set(parent, window.getComputedStyle(parent).backgroundImage);
    }
    const image = sourceImages.get(parent);
    if (!image || image === 'none') return;
    const chars = Array.from(parent.querySelectorAll('.story-char'));
    if (chars.length === 0) return;
    const line = parent.closest('[data-line]') ?? root;

    const at = chars.map((char) => offsetWithin(char, line));
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    chars.forEach((char, i) => {
      minX = Math.min(minX, at[i].x);
      minY = Math.min(minY, at[i].y);
      maxX = Math.max(maxX, at[i].x + char.offsetWidth);
      maxY = Math.max(maxY, at[i].y + char.offsetHeight);
    });
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);

    parent.style.backgroundImage = 'none';
    chars.forEach((char, i) => {
      const s = char.style;
      s.backgroundImage = image;
      s.backgroundRepeat = 'no-repeat';
      s.backgroundSize = `${width}px ${height}px`;
      s.backgroundPosition = `${-(at[i].x - minX)}px ${-(at[i].y - minY)}px`;
      s.webkitBackgroundClip = 'text';
      s.backgroundClip = 'text';
      s.color = 'transparent';
    });
  });
}

/**
 * The cover headline's entrance: lines are declared explicitly (content +
 * optional per-line classes for the staggered indents the reference sites
 * use) rather than auto-wrapped, so the breaks are art-directed. On mount
 * each line is split into characters (GSAP SplitText) and every character
 * flips up out of the page — hinged at its baseline, starting tipped back
 * past vertical, lifting and fading in — one line after the next, under the
 * line's own perspective. Words never break between their characters.
 *
 * Assistive tech reads one plain-text copy of the heading (visually hidden),
 * and the visual lines are aria-hidden whether split or not — never a name
 * hung on a generic span, which screen readers are free to ignore.
 *
 * Static under reduced motion. The split is reverted on unmount.
 */
export function MaskedLines({ as: Tag = 'h1', className, lines, delay = 0 }) {
  const ref = useRef(null);
  const label = lines
    .map((line) => plainText(line.content).trim())
    .filter(Boolean)
    .join(' ');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    const sourceImages = new Map();
    const repaint = () => paintGradientSlices(el, sourceImages);
    let split;

    const ctx = gsap.context(() => {
      const lineEls = Array.from(el.querySelectorAll('[data-line]'));
      split = new SplitText(lineEls, {
        type: 'words,chars',
        tag: 'span', // phrasing content inside the heading, not <div>s
        aria: 'none', // the heading's own sr-only copy carries the text
        wordsClass: 'story-char-word',
        charsClass: 'story-char',
      });
      gsap.set(split.words, { transformStyle: 'preserve-3d' });
      repaint();

      lineEls.forEach((line, i) => {
        const chars = split.chars.filter((c) => line.contains(c));
        if (chars.length === 0) return;
        gsap.fromTo(
          chars,
          { rotateX: -95, yPercent: 40, opacity: 0, transformOrigin: '50% 100% -20px' },
          {
            rotateX: 0,
            yPercent: 0,
            opacity: 1,
            duration: 1.1,
            ease: 'expo.out',
            stagger: 0.018,
            delay: delay + i * 0.12,
            clearProps: 'transform,opacity',
          },
        );
      });
    }, el);

    // Characters reflow with the viewport and with the web font arriving;
    // keep each gradient slice under its character.
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(repaint, 120);
    };
    window.addEventListener('resize', onResize);
    let alive = true;
    document.fonts?.ready?.then(() => {
      if (alive) repaint();
    });

    return () => {
      alive = false;
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      ctx.revert();
      split?.revert();
    };
  }, [delay]);

  return (
    <Tag ref={ref} className={className}>
      <span className="sr-only">{label}</span>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {/* A space before each block line: invisible in layout, but it
              keeps the words apart when the heading is read as plain text
              (search snippets, crawlers of the prerendered HTML). */}{' '}
          <span aria-hidden="true" className={`block ${line.className ?? ''}`}>
            <span data-line className="block" style={{ perspective: '900px' }}>
              {line.content}
            </span>
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
