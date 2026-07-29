#!/usr/bin/env node
/**
 * Minimal static file server for local preview: `npm run serve`.
 * The dashboard fetches data/feed.json, which the file:// protocol blocks,
 * so it needs to be served over http even though it is a static site.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 4321);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  const requested = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  const resolved = path.join(ROOT, requested === '/' ? 'index.html' : requested);

  // Refuse to serve outside the project root.
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const info = await stat(resolved);
    const filePath = info.isDirectory() ? path.join(resolved, 'index.html') : resolved;
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(filePath)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, () => {
  console.log(`TechPulse dev server → http://localhost:${PORT}`);
});
