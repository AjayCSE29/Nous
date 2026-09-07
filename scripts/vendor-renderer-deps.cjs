#!/usr/bin/env node
// Copies renderer-side dependencies from node_modules into src/renderer/vendor
// so the packaged app ships self-contained scripts with no runtime node_modules.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const vendor = path.join(root, 'src', 'renderer', 'vendor');
const katex = path.join(vendor, 'katex');

const copies = [
  ['node_modules/marked/lib/marked.umd.js', 'vendor/marked.umd.js'],
  ['node_modules/dompurify/dist/purify.min.js', 'vendor/purify.min.js'],
  ['node_modules/katex/dist/katex.min.js', 'vendor/katex/katex.min.js'],
  ['node_modules/katex/dist/katex.min.css', 'vendor/katex/katex.min.css'],
  ['node_modules/katex/dist/contrib/auto-render.min.js', 'vendor/katex/auto-render.min.js'],
];

for (const [src, rel] of copies) {
  const from = path.join(root, src);
  const to = path.join(root, 'src', 'renderer', rel);
  if (!fs.existsSync(from)) {
    console.error(`Missing ${src}. Run "npm install" first.`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`  ${src} -> ${path.relative(root, to)}`);
}

const fontsSrc = path.join(root, 'node_modules', 'katex', 'dist', 'fonts');
const fontsDst = path.join(katex, 'fonts');
fs.mkdirSync(fontsDst, { recursive: true });
const fonts = fs.readdirSync(fontsSrc).filter((f) => /\.(woff2?|ttf)$/.test(f));
for (const f of fonts) {
  fs.copyFileSync(path.join(fontsSrc, f), path.join(fontsDst, f));
}
console.log(`  katex fonts: ${fonts.length} files`);
console.log('Renderer deps vendored.');