import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdirSync, readFileSync} from 'node:fs';

for (const task of ['build:kbs', 'zelvoq-definitions', 'typecheck']) {
  const result = spawnSync('npm', ['run', task], {stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const vite = spawnSync(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'build'],
  {stdio: 'inherit'},
);
if (vite.error) throw vite.error;
if (vite.status !== 0) process.exit(vite.status || 1);

// Solo rutas declaradas por wouter: no crear aliases de nombres de menú.
const routeSources = [
  'src/utils/pane-config.ts',
  'src/components/panes/errors.tsx',
];
const routes = routeSources.flatMap((file) =>
  [...readFileSync(file, 'utf8').matchAll(/path: ['"](\/[^'"]*)['"]/g)].map(
    (match) => match[1],
  ),
);
for (const route of new Set(routes.filter((route) => route !== '/'))) {
  if (!/^\/[a-z-]+$/.test(route))
    throw new Error(`Ruta estática no soportada: ${route}`);
  mkdirSync(`dist${route}`, {recursive: true});
  copyFileSync('dist/index.html', `dist${route}/index.html`);
}
