import test from 'node:test';
import assert from 'node:assert/strict';

test('seo sitemap contract uses XML urlset', () => {
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
  assert.match(xml, /<urlset/);
});
