import { Link } from 'react-router-dom';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { StoryCover } from '../../components/marketing/StoryCover.jsx';
import { formatDay } from '../../components/marketing/ContentArticle.jsx';
import { CONTENT_PAGES } from '../../content/registry.generated.js';

/** Every published guide, newest first — built from the content registry. */
export function BlogIndex() {
  const posts = CONTENT_PAGES.filter((p) => p.section === 'blog' && p.published).sort((a, b) =>
    b.updated.localeCompare(a.updated),
  );
  return (
    <div className="min-h-screen">
      <StoryCover
        station="crystals"
        eyebrow="Guides"
        sub="Practical guides to B2B prospecting: finding and checking work email addresses, building contact lists and running outreach that gets replies."
        lines={[
          { content: 'Prospecting' },
          {
            content: <span className="bg-gradient-brand bg-clip-text text-transparent">guides.</span>,
            className: 'sm:ml-[6vw]',
          },
        ]}
      />
      <section
        data-chapter
        data-chapter-title="All guides"
        data-station="drift"
        data-station-side="0"
        className="relative py-6 text-text sm:py-10"
      >
        <div className="mx-auto max-w-[948px] px-3 sm:px-6">
          <div className="story-glass px-6 py-12 sm:px-12 sm:py-16">
            {posts.length === 0 ? (
              <p className="text-base text-text-muted">The first guides are on their way.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {posts.map((post) => (
                  <li key={post.path} className="py-6 first:pt-0 last:pb-0">
                    <Link to={post.path} className="group block">
                      <h2 className="text-xl font-extrabold leading-snug text-text group-hover:text-primary">
                        {post.title.replace(/ \| DataPit$/, '')}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-text-muted">{post.description}</p>
                      <p className="mt-2 text-xs text-text-muted">
                        Updated <time dateTime={post.updated}>{formatDay(post.updated)}</time>
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
