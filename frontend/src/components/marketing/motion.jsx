import { motion, useReducedMotion } from 'framer-motion';

// Matches the CSS `ease-brand` cubic-bezier (see tailwind.config.js) used on
// every hover/hand-written transition elsewhere on the marketing site — one
// motion language, not two.
const EASE = [0.2, 0.8, 0.2, 1];

const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/**
 * Fades/slides a block in — on scroll into view by default, or immediately
 * on mount with `whileInView={false}` (for above-the-fold content like a
 * hero, which is already in view on load so there's nothing to "scroll
 * into"). Respects prefers-reduced-motion by rendering the plain tag with
 * no animation at all, same posture as the Animated*Mockup components in
 * this folder.
 */
export function FadeIn({
  children,
  as = 'div',
  className,
  delay = 0,
  whileInView = true,
  ...props
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    const Plain = as;
    return (
      <Plain className={className} {...props}>
        {children}
      </Plain>
    );
  }

  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial="hidden"
      variants={{
        hidden: fadeUpVariants.hidden,
        show: { ...fadeUpVariants.show, transition: { ...fadeUpVariants.show.transition, delay } },
      }}
      {...(whileInView
        ? { whileInView: 'show', viewport: { once: true, margin: '-80px' } }
        : { animate: 'show' })}
      {...props}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Pairs with StaggerItem below for grids/lists that should reveal one after
 * another rather than all at once — feature cards, bullet points, hero copy
 * lines. Same reduced-motion and whileInView-vs-mount posture as FadeIn.
 */
export function Stagger({
  children,
  as = 'div',
  className,
  staggerDelay = 0.08,
  whileInView = true,
  ...props
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    const Plain = as;
    return (
      <Plain className={className} {...props}>
        {children}
      </Plain>
    );
  }

  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial="hidden"
      variants={{ hidden: {}, show: { transition: { staggerChildren: staggerDelay } } }}
      {...(whileInView
        ? { whileInView: 'show', viewport: { once: true, margin: '-80px' } }
        : { animate: 'show' })}
      {...props}
    >
      {children}
    </MotionTag>
  );
}

export function StaggerItem({ children, as = 'div', className, ...props }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    const Plain = as;
    return (
      <Plain className={className} {...props}>
        {children}
      </Plain>
    );
  }

  const MotionTag = motion[as];
  return (
    <MotionTag className={className} variants={fadeUpVariants} {...props}>
      {children}
    </MotionTag>
  );
}
