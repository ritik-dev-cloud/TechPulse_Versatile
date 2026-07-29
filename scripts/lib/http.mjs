/**
 * Shared HTTP helpers for fetching feeds.
 *
 * The content-type and body assertions here exist because two real sources
 * failed in ways a status-code check accepts:
 *  - an Azure CDN feed URL returned HTTP 200 with a favicon body
 *  - a retired event-industry blog still served valid RSS after its domain was
 *    repurposed into casino spam
 * So "200 OK" is not evidence that a URL is a feed, let alone the right one.
 */

export const TIMEOUT_MS = 20_000;

export const USER_AGENT =
  'TechPulse/1.0 (+https://github.com/techpulse; personal tech-news aggregator; contact via repo issues)';

// A handful of publisher sites behind a WAF reject unrecognised agents with a
// 403. Used only for feeds that declare `"userAgent": "browser"`.
export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export function agentFor(feed) {
  return feed?.userAgent === 'browser' ? BROWSER_USER_AGENT : USER_AGENT;
}

const XML_CONTENT_TYPES =
  /(xml|rss|atom|json|text\/plain|application\/octet-stream)/i;

/**
 * Decide whether a response body is plausibly the feed we asked for.
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
export function validateFeedResponse({ body, contentType }) {
  if (contentType && !XML_CONTENT_TYPES.test(contentType)) {
    return { ok: false, reason: `unexpected content-type: ${contentType}` };
  }
  const head = String(body ?? '').slice(0, 2000);
  if (!head.trim()) return { ok: false, reason: 'empty body' };
  if (/^\s*(<!doctype html|<html)/i.test(head)) {
    return { ok: false, reason: 'served an HTML page, not a feed' };
  }
  if (!/<(rss|feed|rdf:RDF)\b/i.test(head)) {
    return { ok: false, reason: 'no <rss>/<feed> root element' };
  }
  return { ok: true };
}

/**
 * GET a URL with a timeout and one retry on transient failures.
 * @returns {Promise<{body: string, status: number, contentType: string}>}
 */
export async function fetchText(url, { headers = {}, attempts = 2, userAgent = USER_AGENT } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': userAgent, accept: '*/*', ...headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'follow',
      });
      if (response.ok) {
        return {
          body: await response.text(),
          status: response.status,
          contentType: (response.headers.get('content-type') ?? '').split(';')[0].trim(),
        };
      }
      // 4xx other than 429 will not fix itself on retry.
      const retryable = response.status === 429 || response.status >= 500;
      lastError = new Error(`HTTP ${response.status}`);
      lastError.status = response.status;
      if (!retryable || attempt === attempts) throw lastError;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 900 * attempt));
  }
  throw lastError ?? new Error('fetch failed');
}
