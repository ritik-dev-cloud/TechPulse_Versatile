/**
 * Regression tests for the feed parser and the ingest guards.
 *
 * Every case here corresponds to a real failure observed against a live
 * source while building this project — not hypothetical edge cases.
 *
 *   npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, toPlainText, decodeEntities, unwrapCdata } from '../scripts/lib/parse-feed.mjs';
import { validateFeedResponse } from '../scripts/lib/http.mjs';

test('parses a minimal RSS 2.0 feed', () => {
  const { feedTitle, items } = parseFeed(`<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <title>Example Blog</title>
      <item>
        <title>Hello world</title>
        <link>https://example.com/hello</link>
        <pubDate>Tue, 28 Jul 2026 10:00:00 GMT</pubDate>
        <description>A short summary.</description>
      </item>
    </channel></rss>`);

  assert.equal(feedTitle, 'Example Blog');
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Hello world');
  assert.equal(items[0].link, 'https://example.com/hello');
  assert.equal(items[0].summary, 'A short summary.');
  assert.equal(items[0].published, '2026-07-28T10:00:00.000Z');
});

test('parses Atom entries and picks the alternate link, not the self link', () => {
  const { items } = parseFeed(`<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Atom Source</title>
      <link rel="self" href="https://example.com/feed.xml"/>
      <entry>
        <title>Atom post</title>
        <link rel="self" href="https://example.com/wrong"/>
        <link rel="alternate" type="text/html" href="https://example.com/right"/>
        <published>2026-07-27T08:30:00Z</published>
        <summary>Body text.</summary>
      </entry>
    </feed>`);

  assert.equal(items.length, 1);
  assert.equal(items[0].link, 'https://example.com/right');
});

// TSNN (Drupal) wraps the link URL in CDATA. The parser originally treated
// anything starting with "<" as an Atom-style tag and produced 0 items from
// 50 valid entries.
test('reads a CDATA-wrapped <link>', () => {
  const { items } = parseFeed(`<rss version="2.0"><channel>
      <title>tsnn</title>
      <item>
        <title><![CDATA[Executive Interview Series]]></title>
        <link><![CDATA[https://www.tsnn.com/event-tech/interview]]></link>
        <description><![CDATA[Some <b>markup</b> here]]></description>
      </item>
    </channel></rss>`);

  assert.equal(items.length, 1);
  assert.equal(items[0].link, 'https://www.tsnn.com/event-tech/interview');
  assert.equal(items[0].title, 'Executive Interview Series');
  assert.equal(items[0].summary, 'Some markup here');
});

test('skips items missing a title or a link rather than emitting junk', () => {
  const { items } = parseFeed(`<rss><channel><title>T</title>
      <item><title>No link here</title></item>
      <item><link>https://example.com/no-title</link></item>
      <item><title>Good</title><link>https://example.com/good</link></item>
    </channel></rss>`);

  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Good');
});

test('decodes named and numeric entities, including double-escaped ampersands', () => {
  assert.equal(decodeEntities('AT&amp;T'), 'AT&T');
  // `&amp;amp;` is how a single literal `&` looks when a publisher escapes its
  // output twice. Pass 1 gives `&amp;`, pass 2 gives `&` — hence two passes.
  assert.equal(decodeEntities('&amp;amp;'), '&');
  assert.equal(decodeEntities('AT&amp;amp;T'), 'AT&T');
  assert.equal(decodeEntities('caf&#233;'), 'café');
  assert.equal(decodeEntities('&#x2014;'), '—');
  assert.equal(decodeEntities('&notarealentity;'), '&notarealentity;');
});

test('unwrapCdata strips wrappers without touching plain text', () => {
  assert.equal(unwrapCdata('<![CDATA[hello]]>'), 'hello');
  assert.equal(unwrapCdata('plain'), 'plain');
});

test('toPlainText truncates on a word boundary and strips scripts', () => {
  const long = `Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor`;
  const short = toPlainText(long, 30);
  assert.ok(short.length <= 31, `expected <=31 chars, got ${short.length}`);
  assert.ok(short.endsWith('…'));
  assert.ok(!short.includes('  '));

  assert.equal(toPlainText('<script>alert(1)</script>Safe text'), 'Safe text');
  assert.equal(toPlainText('<p>One</p><p>Two</p>'), 'One Two');
});

// InfoQ (and Vercel, Discord) put ENTITY-ESCAPED markup in <description>.
// Stripping tags before decoding found no angle brackets, and the later decode
// then surfaced the markup as literal text — the dashboard displayed
// `<img src="https://…"/><p>Microsoft has released…` as an item summary.
test('strips markup that arrives entity-escaped, not just real tags', () => {
  const infoq =
    '&lt;img src="https://res.infoq.com/x.jpg"/&gt;&lt;p&gt;Microsoft has released .NET 11 Preview 6&lt;/p&gt;';
  const text = toPlainText(infoq, 200);
  assert.equal(text, 'Microsoft has released .NET 11 Preview 6');
  assert.ok(!text.includes('<'), `markup leaked: ${text}`);
  assert.ok(!text.includes('img src'), `attribute leaked: ${text}`);
});

test('strips double-escaped markup too', () => {
  assert.equal(toPlainText('&amp;lt;p&amp;gt;Nested escape&amp;lt;/p&amp;gt;'), 'Nested escape');
});

test('strips an entity-escaped script block', () => {
  assert.equal(toPlainText('&lt;script&gt;alert(1)&lt;/script&gt;Safe'), 'Safe');
});

test('still decodes entities that were only ever text', () => {
  assert.equal(toPlainText('AT&amp;T caf&#233; &mdash; fine'), 'AT&T café — fine');
});

test('an undated item yields null rather than an invalid date', () => {
  const { items } = parseFeed(
    `<rss><channel><title>T</title><item><title>X</title><link>https://e.com/x</link><pubDate>not a date</pubDate></item></channel></rss>`
  );
  assert.equal(items[0].published, null);
});

// A malformed feed must degrade to "no items", never throw — one bad publisher
// should not fail an unattended run.
test('malformed input returns no items instead of throwing', () => {
  for (const input of ['', '<rss><channel>', 'not xml at all', '{"json":true}', null, undefined]) {
    assert.doesNotThrow(() => parseFeed(input));
    assert.equal(parseFeed(input).items.length, 0);
  }
});

/* ------------------------------------------------------- response validation */

// An Azure CDN feed URL returns HTTP 200 with an image/vnd.microsoft.icon body.
// Status-only checks accept it.
test('rejects a 200 response whose content-type is not feed-like', () => {
  const result = validateFeedResponse({
    body: '\u0000\u0000\u0001\u0000binary',
    contentType: 'image/vnd.microsoft.icon',
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /content-type/);
});

test('rejects an HTML page served in place of a feed', () => {
  const result = validateFeedResponse({
    body: '<!doctype html><html><body>Not a feed</body></html>',
    contentType: 'text/html',
  });
  assert.equal(result.ok, false);
});

test('rejects XML with no feed root element', () => {
  const result = validateFeedResponse({
    body: '<?xml version="1.0"?><catalog><book/></catalog>',
    contentType: 'text/xml',
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /root element/);
});

test('accepts RSS, Atom and RDF roots', () => {
  for (const body of [
    '<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>',
    '<feed xmlns="http://www.w3.org/2005/Atom"></feed>',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"></rdf:RDF>',
  ]) {
    assert.equal(validateFeedResponse({ body, contentType: 'application/xml' }).ok, true);
  }
});

// Krebs and Event Industry News serve real XML to a laptop but a Cloudflare
// challenge page to GitHub's runner IPs. "unexpected content-type: text/html"
// sent us hunting for a dead feed URL when the URL was fine.
test('names bot protection instead of blaming the content-type', () => {
  const challenge =
    '<!DOCTYPE html><html><head><title>Just a moment...</title></head><body>' +
    '<div class="cf-browser-verification">Enable JavaScript and cookies to continue</div></body></html>';
  const result = validateFeedResponse({ body: challenge, contentType: 'text/html' });
  assert.equal(result.ok, false);
  assert.match(result.reason, /bot protection/);
  assert.doesNotMatch(result.reason, /content-type/);
});

test('an ordinary HTML page is still reported as an HTML page', () => {
  const result = validateFeedResponse({
    body: '<!doctype html><html><body>A normal marketing page</body></html>',
    contentType: 'text/html',
  });
  assert.equal(result.ok, false);
  assert.doesNotMatch(result.reason, /bot protection/);
});

test('accepts a feed served with a vague content-type', () => {
  // Some publishers send application/octet-stream or text/plain for valid XML.
  assert.equal(
    validateFeedResponse({
      body: '<rss version="2.0"><channel></channel></rss>',
      contentType: 'text/plain',
    }).ok,
    true
  );
});

// An unattended run has nobody watching, so a rejection must say enough to
// diagnose itself later. "unexpected content-type: text/html" alone does not
// distinguish a dead URL from a moved publisher from a WAF block.
test('includes the page title when rejecting an unexpected HTML response', () => {
  const result = validateFeedResponse({
    body: '<!doctype html><html><head><title>Access Denied — Error 1020</title></head><body>no</body></html>',
    contentType: 'text/html',
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /page title: "Access Denied — Error 1020"/);
});

test('tolerates an HTML rejection with no title', () => {
  const result = validateFeedResponse({ body: '<html><body>bare</body></html>', contentType: 'text/html' });
  assert.equal(result.ok, false);
  assert.doesNotMatch(result.reason, /page title/);
});

// Krebs on Security serves a valid RSS 2.0 document with
// `content-type: text/html`. Trusting the header over the body rejected a
// working feed and mislabelled it an HTML page.
test('accepts a valid feed served with a text/html Content-Type', () => {
  const body =
    '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>' +
    '<title>Krebs on Security</title><item><title>A post</title>' +
    '<link>https://krebsonsecurity.com/a</link></item></channel></rss>';
  assert.equal(validateFeedResponse({ body, contentType: 'text/html; charset=UTF-8' }).ok, true);
});

// ...but an actual HTML page that merely mentions "<rss" must still be refused,
// which is what the rootAt < htmlAt ordering guard is for.
test('rejects an HTML page that merely mentions <rss later in the text', () => {
  const body =
    '<!doctype html><html><head><title>How RSS works</title></head><body>' +
    '<p>A feed starts with &lt;rss version="2.0"&gt; like this: <rss></p></body></html>';
  const result = validateFeedResponse({ body, contentType: 'text/html' });
  assert.equal(result.ok, false);
  assert.match(result.reason, /HTML page/);
});
