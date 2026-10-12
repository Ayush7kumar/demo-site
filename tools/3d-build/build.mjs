// Bundles the 3D engine (workflow-3d/js/main.js + textures.js) with three.js and GSAP into one classic script.
// js/config.js is NOT bundled: it stays a plain editable file, so changing words/colours/graph needs no rebuild.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, '..', '..', 'workflow-3d');

const r = await build({
  entryPoints: [path.join(site, 'js', 'main.js')],
  outfile: path.join(site, 'dist', 'engine.js'),
  bundle: true, format: 'iife', minify: true, target: 'es2020', legalComments: 'none', logLevel: 'info',
  nodePaths: [path.join(here, 'node_modules')]
});
console.log(r.errors.length ? 'build failed' : 'built workflow-3d/dist/engine.js');
