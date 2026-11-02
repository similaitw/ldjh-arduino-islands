import * as esbuild from 'esbuild';
import fs from 'fs';
await esbuild.build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', outfile: 'dist/bundle.js', target: 'es2020', legalComments: 'none' });
fs.mkdirSync('dist/media', { recursive: true });
for (const f of fs.readdirSync('node_modules/blockly/media').filter(f => /\.(svg|png|gif|cur)$/.test(f))) fs.copyFileSync('node_modules/blockly/media/' + f, 'dist/media/' + f);
const html = fs.readFileSync('src/index.html', 'utf8').replace('<!--BUNDLE-->', () => '<script>' + fs.readFileSync('dist/bundle.js', 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>');
fs.writeFileSync('dist/index.html', html);
console.log('built', (html.length / 1024).toFixed(0) + 'KB');
