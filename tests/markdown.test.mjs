/**
 * Tests for the research-brief Markdown renderer.
 *
 * The blockquote case is a regression test: because the renderer escapes the
 * whole document before parsing blocks, a Markdown `>` marker arrives as
 * `&gt;`, and the original `/^\s*>/` check silently matched nothing — every
 * blockquote in every brief rendered as a plain paragraph.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../assets/markdown.js';

const render = (source) => renderMarkdown(source).html;

test('renders headings and records them for navigation', () => {
  const { html, headings } = renderMarkdown('# Title\n\n## Section one\n\n### Detail');
  assert.match(html, /<h1 id="title">Title<\/h1>/);
  assert.match(html, /<h2 id="section-one">Section one<\/h2>/);
  assert.deepEqual(
    headings.map((h) => [h.level, h.text]),
    [
      [1, 'Title'],
      [2, 'Section one'],
      [3, 'Detail'],
    ]
  );
});

test('renders a blockquote, including multi-line quotes', () => {
  const html = render('> **Note.** First line.\n> Second line.\n\nAfter.');
  assert.match(html, /<blockquote>/);
  assert.match(html, /<strong>Note\.<\/strong>/);
  assert.match(html, /Second line\./);
  assert.match(html, /<p>After\.<\/p>/);
});

test('does not double-escape entities inside a blockquote', () => {
  const html = render('> Uses AT&T and a <tag> plus "quotes".');
  assert.ok(!html.includes('&amp;amp;'), `double-escaped: ${html}`);
  assert.match(html, /AT&amp;T/);
  assert.match(html, /&lt;tag&gt;/);
});

test('renders a table inside a horizontally scrollable wrapper', () => {
  const html = render(['| Repo | License |', '|---|---|', '| pretix | AGPL-3.0 |', '| Indico | MIT |'].join('\n'));
  assert.match(html, /<div class="md-table-wrap">/);
  assert.match(html, /<th>Repo<\/th><th>License<\/th>/);
  assert.equal((html.match(/<tr>/g) ?? []).length, 3); // header + 2 body rows
  assert.ok(!html.includes('---'), 'alignment row leaked into output');
});

test('renders ordered and unordered lists', () => {
  assert.match(render('- one\n- two'), /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(render('1. first\n2. second'), /<ol><li>first<\/li><li>second<\/li><\/ol>/);
});

test('renders fenced code without applying inline formatting inside it', () => {
  const html = render('```bash\nnpm run update && echo **not bold**\n```');
  assert.match(html, /<pre data-lang="bash"><code>/);
  assert.ok(!html.includes('<strong>'), 'emphasis was applied inside a code block');
  assert.match(html, /&amp;&amp;/);
});

test('inline code protects asterisks from the emphasis pass', () => {
  const html = render('Use `a * b * c` carefully.');
  assert.match(html, /<code>a \* b \* c<\/code>/);
  assert.ok(!html.includes('<em>'));
});

test('renders inline links and marks external ones safely', () => {
  const html = render('See [the docs](https://example.com/docs) for detail.');
  assert.match(html, /<a href="https:\/\/example\.com\/docs" target="_blank" rel="noopener noreferrer">the docs<\/a>/);
});

test('autolinks bare URLs without swallowing trailing punctuation', () => {
  const html = render('Source: https://example.com/a/b.');
  assert.match(html, /href="https:\/\/example\.com\/a\/b"/);
  assert.match(html, /<\/a>\./, 'the trailing period should sit outside the link');
});

test('does not rewrite the inside of a link it just produced', () => {
  const html = render('[https://example.com](https://example.com)');
  assert.equal((html.match(/<a /g) ?? []).length, 1);
});

test('refuses non-http schemes in link targets', () => {
  const html = render('[click](javascript:alert(1))');
  assert.ok(!/href="javascript:/i.test(html), `unsafe href emitted: ${html}`);
  assert.match(html, /click/);
});

test('escapes HTML in the source so it cannot introduce elements', () => {
  const html = render('A paragraph with <img src=x onerror=alert(1)> in it.');
  assert.ok(!html.includes('<img'), `raw element survived: ${html}`);
  assert.match(html, /&lt;img/);
});

test('renders emphasis, strong and strikethrough', () => {
  assert.match(render('**bold** text'), /<strong>bold<\/strong>/);
  assert.match(render('an *italic* word'), /<em>italic<\/em>/);
  assert.match(render('~~gone~~'), /<del>gone<\/del>/);
});

test('does not treat a mid-word asterisk as emphasis', () => {
  const html = render('The glob a*b*c stays literal.');
  assert.ok(!html.includes('<em>'), html);
});

test('renders a horizontal rule', () => {
  assert.match(render('above\n\n---\n\nbelow'), /<hr \/>/);
});

test('joins wrapped paragraph lines into one paragraph', () => {
  const html = render('First line\nsecond line\n\nNew paragraph');
  assert.equal((html.match(/<p>/g) ?? []).length, 2);
  assert.match(html, /<p>First line second line<\/p>/);
});

test('handles empty and whitespace-only input', () => {
  assert.equal(render(''), '');
  assert.equal(render('\n\n  \n'), '');
});
