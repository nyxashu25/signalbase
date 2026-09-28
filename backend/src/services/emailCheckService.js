import { Resolver } from 'node:dns/promises';
import { readFileSync } from 'node:fs';
import { domainToASCII } from 'node:url';
import { isValidHostname } from '../utils/domain.js';

// The public email verifier (POST /public/tools/verify-email). Checks what
// can be checked from DNS alone — syntax, domain, MX records — plus
// bundled lists of disposable domains, role inboxes and free providers.
// Deliberately no SMTP probing, no paid provider (that's the in-app
// /tools/verify-email, see emailVerifierService.js), and the address is
// never stored or logged.

const DNS_TIMEOUT_MS = 3000;
// One try per query so a dead resolver costs ~3s, not tries × timeout.
// MX, A and AAAA go out in parallel for the same reason.
const resolver = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: 1 });

const MAX_MX_HOSTS = 5;

// The resolver's timeout is per server and per try, so a host with several
// nameservers in resolv.conf could still wait timeout × servers. This caps
// each lookup's wall-clock time regardless; a lookup that hits it counts
// as a timeout (the query itself is left to finish in the background —
// cancel() would abort every in-flight query on the shared resolver).
const DNS_DEADLINE_MS = DNS_TIMEOUT_MS + 1000;

// Top-level names that never resolve on the public internet (RFC 2606 /
// 6761 / 7686, ICANN's .internal, and the common private-network ones).
// An address there can't receive mail from outside, and looking it up
// would only probe the server's own resolver for internal names.
const RESERVED_TLDS = new Set([
  'localhost',
  'local',
  'localdomain',
  'test',
  'example',
  'invalid',
  'internal',
  'onion',
  'arpa',
  'lan',
  'home',
  'corp',
  'intranet',
  'private',
]);

// Answers that mean "that record doesn't exist". Anything else (ETIMEOUT,
// ESERVFAIL, EREFUSED, ...) means the lookup failed and we don't know.
const DEFINITIVE_MISS = new Set(['ENODATA', 'ENOTFOUND']);

// Bundled word lists in src/data/ — one entry per line, # comments. Read
// once at startup; nothing is fetched over the network.
function loadList(file) {
  return new Set(
    readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line && !line.startsWith('#')),
  );
}

const DISPOSABLE_DOMAINS = loadList('disposableDomains.txt');
// Stored already normalized: lowercase, no . _ - (see isRoleAccount).
const ROLE_LOCAL_PARTS = loadList('roleAccounts.txt');
const FREE_PROVIDER_DOMAINS = loadList('freeEmailProviders.txt');

// Providers with a domain per country — gmx.de, yandex.ru, yahoo.co.uk,
// hotmail.fr, outlook.es. Matched only as "<family>.<tld>" or
// "<family>.<co|com|...>.<cc>", so a company subdomain like
// outlook.acme.com doesn't count.
const FREE_PROVIDER_FAMILIES = new Set(['gmx', 'yandex', 'yahoo', 'hotmail', 'outlook']);

// Local part: RFC 5322 dot-atom (no quoted strings), at most 64 chars.
const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;

function parseAddress(raw) {
  const parts = raw.split('@');
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (!local || local.length > 64 || !LOCAL_PART.test(local)) return null;
  const asciiDomain = domainToASCII(domain.toLowerCase());
  if (!isValidHostname(asciiDomain)) return null;
  return { local, domain: domain.toLowerCase(), asciiDomain };
}

function isDisposable(domain) {
  const labels = domain.split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    if (DISPOSABLE_DOMAINS.has(labels.slice(i).join('.'))) return true;
  }
  return false;
}

function isRoleAccount(local) {
  const base = local.toLowerCase().split('+')[0].replace(/[._-]/g, '');
  return ROLE_LOCAL_PARTS.has(base);
}

function isFreeProvider(domain) {
  if (FREE_PROVIDER_DOMAINS.has(domain)) return true;
  const labels = domain.split('.');
  if (!FREE_PROVIDER_FAMILIES.has(labels[0])) return false;
  if (labels.length === 2) return true;
  return labels.length === 3 && labels[1].length <= 3 && labels[2].length === 2;
}

function settle(promise) {
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ error: 'ETIMEOUT' }), DNS_DEADLINE_MS);
  });
  const answer = promise.then(
    (records) => ({ records }),
    (err) => ({ error: err?.code ?? 'EUNKNOWN' }),
  );
  return Promise.race([answer, deadline]).finally(() => clearTimeout(timer));
}

/**
 * Looks the domain up in DNS. `status` is one of:
 *   mx          — has MX records (mxHosts sorted by priority)
 *   null_mx     — publishes an RFC 7505 "null MX": accepts no mail at all
 *   address     — no MX, but A/AAAA records exist
 *   none        — no MX and no A/AAAA: the domain doesn't resolve (or it
 *                 is under a reserved, never-public TLD; not looked up)
 *   unknown     — a lookup timed out or failed, so we can't tell
 */
async function lookupDomain(domain) {
  if (RESERVED_TLDS.has(domain.slice(domain.lastIndexOf('.') + 1))) {
    return { status: 'none', mxHosts: [] };
  }
  const [mx, a, aaaa] = await Promise.all([
    settle(resolver.resolveMx(domain)),
    settle(resolver.resolve4(domain)),
    settle(resolver.resolve6(domain)),
  ]);

  if (mx.records?.length) {
    const real = mx.records.filter((r) => r.exchange && r.exchange !== '.');
    if (real.length === 0) return { status: 'null_mx', mxHosts: [] };
    const mxHosts = [...real]
      .sort((x, y) => x.priority - y.priority || x.exchange.localeCompare(y.exchange))
      .slice(0, MAX_MX_HOSTS)
      .map((r) => r.exchange.toLowerCase().replace(/\.$/, ''));
    return { status: 'mx', mxHosts };
  }
  if (mx.error && !DEFINITIVE_MISS.has(mx.error)) return { status: 'unknown', mxHosts: [] };

  if (a.records?.length || aaaa.records?.length) return { status: 'address', mxHosts: [] };
  // NXDOMAIN on the MX query is an answer for the name itself — every
  // record type is missing, whatever the A/AAAA lookups did.
  if (mx.error === 'ENOTFOUND') return { status: 'none', mxHosts: [] };
  const addressMiss = [a, aaaa].every((r) => r.records || DEFINITIVE_MISS.has(r.error));
  return { status: addressMiss ? 'none' : 'unknown', mxHosts: [] };
}

function result(email, verdict, reason, checks, mxHosts, note) {
  return { email, verdict, reason, checks, mxHosts, note };
}

/** The public verify-email response body for a (trimmed) address. */
export async function checkEmail(rawEmail) {
  const at = rawEmail.lastIndexOf('@');
  const displayEmail =
    at >= 0 ? rawEmail.slice(0, at + 1) + rawEmail.slice(at + 1).toLowerCase() : rawEmail;

  const parsed = parseAddress(rawEmail);
  if (!parsed) {
    return result(
      displayEmail,
      'invalid',
      'invalid_syntax',
      {
        syntax: false,
        domainExists: false,
        mxRecords: false,
        disposable: false,
        roleAccount: false,
        freeProvider: false,
      },
      [],
      "This isn't a correctly formatted email address, so it can't receive mail.",
    );
  }

  const { domain, asciiDomain, local } = parsed;
  const dns = await lookupDomain(asciiDomain);
  const checks = {
    syntax: true,
    domainExists: dns.status === 'mx' || dns.status === 'null_mx' || dns.status === 'address',
    mxRecords: dns.status === 'mx',
    disposable: isDisposable(asciiDomain),
    roleAccount: isRoleAccount(local),
    freeProvider: isFreeProvider(asciiDomain),
  };
  const email = `${local}@${domain}`;
  const out = (verdict, reason, note) => result(email, verdict, reason, checks, dns.mxHosts, note);

  switch (dns.status) {
    case 'none':
      return out(
        'invalid',
        'no_domain',
        `The domain ${domain} doesn't exist or has no DNS records, so this address can't receive mail.`,
      );
    case 'null_mx':
      return out(
        'invalid',
        'no_mail_server',
        `${domain} publishes a record saying it accepts no email, so this address can't receive mail.`,
      );
    case 'address':
      return out(
        'risky',
        'no_mail_server',
        `${domain} exists but has no mail (MX) servers set up, so mail sent to this address will probably bounce.`,
      );
    case 'unknown':
      return out(
        'risky',
        'no_mail_server',
        `We couldn't check ${domain}'s mail servers right now (the DNS lookup timed out or failed), so treat this address as unconfirmed.`,
      );
    default:
      break;
  }

  if (checks.disposable) {
    return out(
      'risky',
      'disposable',
      `${domain} is a disposable (temporary) email service, so this address is likely short-lived.`,
    );
  }
  if (checks.roleAccount) {
    return out(
      'risky',
      'role_account',
      'This is a role address that usually reaches a shared team inbox rather than one person.',
    );
  }
  return out(
    'valid',
    'ok',
    `The address is well formed and ${domain} has mail servers set up; we don't contact the mail server, so this can't confirm the mailbox itself exists.`,
  );
}
