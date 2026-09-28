import { domainToASCII } from 'node:url';

// One DNS label: letters/digits/hyphens, no leading or trailing hyphen.
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
// A top-level label: alphabetic, or an IDN TLD in punycode.
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/**
 * True for a bare, lowercase ASCII hostname with at least two labels —
 * "acme.com", "mail.acme.co.uk", "xn--bcher-kva.de". No ports, paths,
 * IP addresses or single-label names.
 */
export function isValidHostname(host) {
  if (!host || host.length > 253) return false;
  const labels = host.split('.');
  if (labels.length < 2) return false;
  if (!labels.every((l) => LABEL.test(l))) return false;
  return TLD.test(labels[labels.length - 1]);
}

/**
 * Turns whatever a person pastes as a "company domain" into a bare
 * hostname: "https://www.Acme.com/about" -> "acme.com",
 * "jane@acme.com" -> "acme.com", "WWW.ACME.COM." -> "acme.com". Unicode
 * hostnames come back in punycode. Returns null when there's no usable
 * hostname in the input.
 */
export function normalizeDomain(input) {
  if (typeof input !== 'string') return null;
  let value = input.trim();
  if (!value) return null;

  // An email address (and not a URL that happens to carry userinfo).
  if (!value.includes('://') && value.includes('@')) {
    value = value.slice(value.lastIndexOf('@') + 1);
  }

  let host;
  try {
    host = new URL(value.includes('://') ? value : `http://${value}`).hostname;
  } catch {
    return null;
  }

  host = domainToASCII(host).toLowerCase().replace(/\.+$/, '');
  if (host.startsWith('www.')) host = host.slice(4);
  return isValidHostname(host) ? host : null;
}
