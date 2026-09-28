// Tells IndexNow-enabled search engines (Bing, and through it ChatGPT search
// and Copilot; also Yandex, Seznam, Naver) that the public pages changed, so
// they recrawl within minutes instead of waiting for the next scheduled
// visit. Run after a deploy that changes marketing copy:
//
//   npm run indexnow
//
// The key is public by design: the engines fetch
// https://datapit.io/<key>.txt and compare it with the key in the request.
import { SEO_ROUTES, SITE_URL, absoluteUrl } from '../src/seo/site.js';

const KEY = '0816f6fe997d457477d1b1baccfc314c';

const body = {
  host: new URL(SITE_URL).host,
  key: KEY,
  keyLocation: `${SITE_URL}/${KEY}.txt`,
  urlList: SEO_ROUTES.map((r) => absoluteUrl(r.path)),
};

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

// 200 = accepted, 202 = accepted while the key is being verified.
console.log(`indexnow: ${res.status} ${res.statusText} for ${body.urlList.length} URLs`);
if (!res.ok) {
  console.log(await res.text());
  process.exitCode = 1;
}
