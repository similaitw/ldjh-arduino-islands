import * as esbuild from 'esbuild';
import fs from 'fs';

const pages = [
  { entry: 'src/main.js', html: 'src/lab.html', out: 'lab.html' },
  { entry: 'src/home.js', html: 'src/home.html', out: 'index.html' },
];

fs.mkdirSync('dist/media', { recursive: true });
for (const p of pages) {
  const r = await esbuild.build({ entryPoints: [p.entry], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none' });
  const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const html = fs.readFileSync(p.html, 'utf8').replace('<!--BUNDLE-->', () => '<script>' + js + '</script>');
  fs.writeFileSync('dist/' + p.out, html);
  console.log('built', p.out, (html.length / 1024).toFixed(0) + 'KB');
}
for (const f of fs.readdirSync('node_modules/blockly/media').filter(f => /\.(svg|png|gif|cur)$/.test(f))) {
  fs.copyFileSync('node_modules/blockly/media/' + f, 'dist/media/' + f);
}
