import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  readdir,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';

test('overrides preserve index shape, register new IDs and invalidate the cache', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zelvoq-definitions-'));
  try {
    const output = join(root, 'definitions');
    const overrides = join(root, 'overrides');
    await mkdir(join(output, 'v3'), {recursive: true});
    await mkdir(join(output, 'v2'));
    await mkdir(overrides);
    const index = {
      generatedAt: 123,
      version: '2',
      theme: {name: 'original'},
      vendorProductIds: {v2: [1], v3: [2]},
    };
    await writeFile(join(output, 'supported_kbs.json'), JSON.stringify(index));
    await writeFile(join(output, 'v2/1.json'), '{"name":"upstream"}');
    await writeFile(join(output, 'hash.json'), '"upstream"');
    // Definicion V3 completa: el script la pasa por el reader, que exige
    // nombre, matriz y un layouts.keymap en formato KLE.
    const definition = {
      name: 'Prueba',
      vendorId: '0x0001',
      productId: '0x0002',
      matrix: {rows: 1, cols: 2},
      menus: ['qmk_rgb_matrix'],
      layouts: {keymap: [[{x: 0}, '0,0', '0,1']]},
    };
    const run = () => {
      const result = spawnSync(
        process.execPath,
        ['scripts/zelvoq-definitions.mjs', output, overrides],
        {encoding: 'utf8'},
      );
      assert.equal(result.status, 0, result.stderr);
    };
    await writeFile(join(overrides, 'board.json'), JSON.stringify(definition));
    run();
    const updated = JSON.parse(
      await readFile(join(output, 'supported_kbs.json')),
    );
    assert.deepEqual(updated, {
      ...index,
      vendorProductIds: {v2: [1], v3: [2, 65538]},
    });
    // Lo publicado es la definicion transformada por el reader, no la fuente:
    // vendorProductId en vez de vendorId/productId, y layouts.keys parseado
    // desde el KLE. Publicar la fuente dejaba layouts.keys sin definir y la
    // app reventaba al conectar el teclado.
    const publicada = JSON.parse(
      await readFile(join(output, 'v3/65538.json')),
    );
    assert.equal(publicada.vendorProductId, 65538);
    assert.equal(publicada.vendorId, undefined);
    assert.deepEqual(publicada.menus, definition.menus);
    assert.equal(publicada.layouts.keys.length, 2);
    const hash = await readFile(join(output, 'hash.json'), 'utf8');
    assert.equal(typeof JSON.parse(hash), 'string');
    run();
    assert.equal(await readFile(join(output, 'hash.json'), 'utf8'), hash);
    await writeFile(
      join(overrides, 'board.json'),
      JSON.stringify({...definition, menus: []}),
    );
    run();
    assert.notEqual(await readFile(join(output, 'hash.json'), 'utf8'), hash);
    const nextHash = await readFile(join(output, 'hash.json'), 'utf8');
    await writeFile(
      join(output, 'supported_kbs.json'),
      JSON.stringify({...updated, version: '3'}),
    );
    run();
    assert.notEqual(
      await readFile(join(output, 'hash.json'), 'utf8'),
      nextHash,
    );
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('subpath is wired through Vite, router and definition requests', async () => {
  assert.match(await readFile('vite.config.ts', 'utf8'), /base: '\/configurador\/'/);
  assert.match(
    await readFile('src/index.tsx', 'utf8'),
    /<Router\s+base=.*BASE_URL/,
  );
  const store = await readFile('src/utils/device-store.ts', 'utf8');
  assert.match(store, /import.meta.env.BASE_URL/);
  assert.doesNotMatch(store, /['"`]\/definitions\//);
});

test('rejects invalid or duplicated hardware IDs before applying overrides', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zelvoq-invalid-definitions-'));
  try {
    const output = join(root, 'definitions');
    const overrides = join(root, 'overrides');
    await mkdir(output);
    await mkdir(overrides);
    await writeFile(
      join(output, 'supported_kbs.json'),
      JSON.stringify({vendorProductIds: {v2: [], v3: []}}),
    );
    const file = join(overrides, 'board.json');
    await writeFile(
      file,
      JSON.stringify({vendorId: 'bad', productId: '0x0001'}),
    );
    const run = () =>
      spawnSync(
        process.execPath,
        ['scripts/zelvoq-definitions.mjs', output, overrides],
        {encoding: 'utf8'},
      );
    const invalid = run();
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /VID\/PID inválido/);
    const valid = JSON.stringify({vendorId: '0x0001', productId: '0x0002'});
    await writeFile(file, valid);
    await writeFile(join(overrides, 'duplicate.json'), valid);
    const duplicate = run();
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /VID\/PID duplicado/);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('distribution keeps GPL and source notice', async () => {
  assert.equal(
    await readFile('public/LICENSE', 'utf8'),
    await readFile('LICENSE', 'utf8'),
  );
  const links = await readFile(
    'src/components/menus/external-links.tsx',
    'utf8',
  );
  assert.match(links, /https:\/\/github.com\/ramiel-dev\/zelvoq-configurador/);
  assert.match(links, /GPL-3.0/);
});

test(
  'built subpath entrypoints and all local HTML/CSS assets exist',
  {skip: !process.env.TEST_DIST},
  async () => {
    const html = await readFile('dist/index.html', 'utf8');
    const hash = JSON.parse(
      await readFile('dist/definitions/hash.json', 'utf8'),
    );
    assert.ok(
      html.includes(`data-hash="${hash}"`),
      'el HTML debe incluir el hash final de las definiciones',
    );
    const panes = await readFile('src/utils/pane-config.ts', 'utf8');
    const errors = await readFile('src/components/panes/errors.tsx', 'utf8');
    const paths = [...(panes + errors).matchAll(/path: ['"](\/[^'"]*)['"]/g)]
      .map((m) => m[1])
      .filter((p) => p !== '/');
    for (const path of paths)
      assert.equal(await readFile(`dist${path}/index.html`, 'utf8'), html);
    const dirs = (await readdir('dist', {withFileTypes: true}))
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const dir of dirs) {
      if (await readFile(`dist/${dir}/index.html`, 'utf8').catch(() => null))
        assert.ok(paths.includes(`/${dir}`), dir);
    }
    const css = (
      await Promise.all(
        (await readdir('dist/assets'))
          .filter((p) => p.endsWith('.css'))
          .map((p) => readFile(`dist/assets/${p}`, 'utf8')),
      )
    ).join('\n');
    for (const match of [
      ...html.matchAll(/(?:src|href|content)="(\/[^" ]+)"/g),
      ...css.matchAll(/url\(["']?(\/[^)'" ]+)/g),
    ]) {
      assert.ok(match[1].startsWith('/configurador/'), match[1]);
      await readFile(`dist/${match[1].slice('/configurador/'.length)}`);
    }
    assert.doesNotMatch(html, /chippy|usevia.app/i);
    const manifest = JSON.parse(await readFile('dist/site.webmanifest'));
    for (const icon of manifest.icons) await readFile(join('dist', icon.src));
    assert.equal(
      await readFile('dist/LICENSE', 'utf8'),
      await readFile('LICENSE', 'utf8'),
    );
    assert.ok(
      !(await readdir('dist/fonts')).some((name) => name.includes('Gotham')),
    );
    await assert.rejects(readFile('dist/github_oauth.html'), {code: 'ENOENT'});
  },
);

test(
  'static hosting resolves /configurador/test/ and definitions without SPA fallback',
  {skip: !process.env.TEST_DIST},
  async () => {
    const server = createServer(async (req, res) => {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (!pathname.startsWith('/configurador/') || pathname.includes('..')) {
        res.writeHead(404).end();
        return;
      }
      try {
        const file = `dist/${pathname.slice('/configurador/'.length)}${pathname.endsWith('/') ? 'index.html' : ''}`;
        res.end(await readFile(file));
      } catch {
        res.writeHead(404).end();
      }
    });
    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      const origin = `http://127.0.0.1:${server.address().port}`;
      for (const path of [
        '/configurador/',
        '/configurador/test/',
        '/configurador/design/',
        '/configurador/console/',
        '/configurador/settings/',
        '/configurador/debug/',
        '/configurador/errors/',
      ]) {
        const response = await fetch(origin + path);
        assert.equal(response.status, 200, path);
        assert.match(await response.text(), /\/configurador\/assets\//);
      }
      const index = await (
        await fetch(`${origin}/configurador/definitions/supported_kbs.json`)
      ).json();
      const id = index.vendorProductIds.v3[0];
      assert.equal(
        (await fetch(`${origin}/configurador/definitions/v3/${id}.json`)).status,
        200,
      );
      assert.equal(
        typeof (await (
          await fetch(`${origin}/configurador/definitions/hash.json`)
        ).json()),
        'string',
      );
      assert.equal((await fetch(`${origin}/configurador/configure/`)).status, 404);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
