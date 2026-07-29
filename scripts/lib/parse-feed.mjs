/**
 * Zero-dependency RSS 2.0 / Atom 1.0 / RDF feed parser.
 *
 * Deliberately dependency-free: this runs unattended in CI against ~40 remote
 * feeds, so every npm package here would be supply-chain surface for no real
 * gain. Feeds are well-formed enough in practice that targeted extraction beats
 * a full XML parse, and a malformed feed degrades to "skipped" rather than
 * crashing the run.
 */

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  middot: '·',
  bull: '•',
  eacute: 'é',
  trade: '™',
  reg: '®',
  copy: '©',
};

/** Decode XML/HTML entities, including numeric ones. Runs twice for &amp;amp;. */
export function decodeEntities(input = '') {
  let out = String(input);
  for (let pass = 0; pass < 2; pass++) {
    out = out.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body) => {
      if (body[0] === '#') {
        const code =
          body[1] === 'x' || body[1] === 'X'
            ? parseInt(body.slice(2), 16)
            : parseInt(body.slice(1), 10);
        if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return match;
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      const named = ENTITIES[body.toLowerCase()];
      return named === undefined ? match : named;
    });
  }
  return out;
}

/** Remove CDATA wrappers, leaving the raw inner text. */
export function unwrapCdata(input = '') {
  return String(input).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

/** Strip CDATA wrappers, tags and entities down to readable plain text. */
export function toPlainText(input = '', maxLength = 320) {
  let text = String(input)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  text = decodeEntities(text)
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  // Cut on a word boundary so summaries don't end mid-word.
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Inner text of the first <tag> in `xml`, or '' when absent. */
function tag(xml, names) {
  for (const name of [].concat(names)) {
    const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i').exec(xml);
    if (match && match[1].trim()) return match[1];
  }
  return '';
}

/**
 * Atom entries carry several <link>s; the alternate/html one is the article.
 * RSS uses a plain <link> text node, except in RDF where it may be either.
 */
function extractLink(itemXml) {
  // Drupal-based feeds (TSNN and friends) wrap the URL in CDATA, so unwrap
  // before deciding whether this is a text node or an Atom-style <link> tag.
  const plain = unwrapCdata(tag(itemXml, 'link')).trim();
  if (plain && !plain.startsWith('<')) return decodeEntities(plain);

  const links = itemXml.match(/<link\b[^>]*\/?>/gi) || [];
  const href = (linkTag) => {
    const m = /href\s*=\s*["']([^"']+)["']/i.exec(linkTag);
    return m ? decodeEntities(m[1]) : '';
  };
  const alternate = links.find((l) => /rel\s*=\s*["']alternate["']/i.test(l));
  if (alternate) return href(alternate);
  const untyped = links.find((l) => !/rel\s*=\s*["']/i.test(l));
  if (untyped) return href(untyped);
  const first = links.map(href).find(Boolean);
  if (first) return first;

  // Last resorts used by some feeds.
  return (
    decodeEntities(tag(itemXml, ['guid', 'id']).trim()).match(/^https?:\/\/\S+$/)?.[0] || ''
  );
}

function extractDate(itemXml) {
  const raw = tag(itemXml, [
    'pubDate',
    'published',
    'updated',
    'dc:date',
    'dcterms:created',
  ]).trim();
  if (!raw) return null;
  const parsed = new Date(decodeEntities(raw));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractAuthor(itemXml) {
  const dc = tag(itemXml, ['dc:creator', 'author']);
  if (!dc) return '';
  // Atom nests <name> inside <author>.
  const name = tag(dc, 'name') || dc;
  return toPlainText(name, 80);
}

/**
 * Parse a feed document into normalised items.
 * @param {string} xml raw feed body
 * @returns {{feedTitle: string, items: Array<object>}}
 */
export function parseFeed(xml) {
  const body = String(xml || '');
  const feedTitle = toPlainText(
    // The channel/feed title is the first <title> outside any item.
    tag(body.split(/<(?:item|entry)\b/i)[0], 'title'),
    120
  );

  const blocks = body.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  const items = [];

  for (const block of blocks) {
    const title = toPlainText(tag(block, 'title'), 200);
    const link = extractLink(block);
    if (!title || !link) continue; // Unusable without both.

    items.push({
      title,
      link,
      published: extractDate(block),
      summary: toPlainText(
        tag(block, ['description', 'summary', 'content:encoded', 'content']),
        320
      ),
      author: extractAuthor(block),
      tags: (block.match(/<category\b[^>]*>([\s\S]*?)<\/category>/gi) || [])
        .map((c) => toPlainText(c.replace(/<[^>]+>/g, ' '), 40))
        .filter(Boolean)
        .slice(0, 5),
    });
  }

  return { feedTitle, items };
}

export const _internals = { tag, extractLink };
