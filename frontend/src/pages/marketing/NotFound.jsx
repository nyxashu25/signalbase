import { Link } from 'react-router-dom';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { StoryCover } from '../../components/marketing/StoryCover.jsx';
import { Magnetic } from '../../components/marketing/Magnetic.jsx';

/**
 * Any URL no route claims. The server answers these with a real 404 status
 * (the prerendered 404.html); this is what that page, and a client-side
 * navigation to a dead link, shows.
 */
export function NotFound() {
  return (
    <div className="min-h-screen">
      <StoryCover
        station="mark"
        eyebrow="Error 404"
        narration="This page was torn out of the book, or never written."
        sub="The link may be old or mistyped. Everything DataPit does is one click away from here."
        lines={[
          { content: 'Page not' },
          {
            content: (
              <span className="bg-gradient-brand bg-clip-text text-transparent">found.</span>
            ),
            className: 'sm:ml-[6vw]',
          },
        ]}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Magnetic className="block">
            <Link
              to="/"
              className="block rounded-md bg-gradient-action px-7 py-3.5 text-center text-sm font-bold text-white shadow-[0_14px_32px_rgba(148,0,222,0.45)] transition-transform duration-150 ease-brand hover:-translate-y-px"
            >
              Back to home
            </Link>
          </Magnetic>
          <Magnetic className="block">
            <Link
              to="/product"
              className="block rounded-md border border-white/20 bg-white/5 px-7 py-3.5 text-center text-sm font-bold text-white backdrop-blur transition-colors duration-150 ease-brand hover:bg-white/10"
            >
              See the product
            </Link>
          </Magnetic>
          <Magnetic className="block">
            <Link
              to="/pricing"
              className="block rounded-md border border-white/20 bg-white/5 px-7 py-3.5 text-center text-sm font-bold text-white backdrop-blur transition-colors duration-150 ease-brand hover:bg-white/10"
            >
              See pricing
            </Link>
          </Magnetic>
        </div>
      </StoryCover>

      <MarketingFooter />
    </div>
  );
}
