/** Run with an isolated Playwright page against the Vite dev server. */
export async function runOledBrowserChecks(
  page,
  base = 'http://127.0.0.1:4176',
) {
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const results = [];
  await page.bringToFront();
  const load = async () => {
    await page.goto(`${base}/configurador/tests/oled-harness.html?fresh=1`);
    await page.getByText('En el teclado:').waitFor();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('img')].every(
        (i) => i.complete && i.naturalWidth === 128,
      ),
    );
  };
  const choose = (name) =>
    page.getByRole('button', {name: new RegExp(`^${name}`)}).click();
  const apply = () =>
    page.getByRole('button', {name: 'Aplicar y guardar'}).click();
  await load();
  const power = () =>
    page.getByRole('checkbox', {name: 'Pantalla encendida', exact: true});
  check(await power().isChecked(), 'New firmware should start enabled');
  const beforeOff = await page.evaluate(() => window.oledHarness.calls.length);
  await power().uncheck();
  await page
    .getByText('Vista previa · pantalla apagada.', {exact: true})
    .waitFor();
  check(
    (await page.evaluate(() => window.oledHarness.calls.length)) === beforeOff,
    'Toggle preview wrote HID',
  );
  await apply();
  await page
    .getByText('Pantalla apagada y guardada en el teclado.', {exact: true})
    .waitFor();
  check(
    (await page.evaluate(() => window.oledHarness.state())).storedEnabled ===
      false,
    'Off not persisted',
  );
  await page.reload();
  await page.getByText('En el teclado:').waitFor();
  check(!(await power().isChecked()), 'Off lost on page reload');
  await page
    .getByText('Vista previa · pantalla apagada.', {exact: true})
    .waitFor();
  await power().check();
  await choose('Firma');
  await apply();
  await page
    .getByText('Firma guardado en el teclado.', {exact: true})
    .waitFor();
  check(
    (await page.evaluate(() => window.oledHarness.state())).storedEnabled ===
      true,
    'On not persisted',
  );
  results.push('Power preview is local; off/on persist across reload');

  await load();
  const count = await page.evaluate(() => window.oledHarness.calls.length);
  await choose('Compañero');
  await page.getByRole('button', {name: 'Ver bienvenida', exact: true}).click();
  check(
    (await page.evaluate(() => window.oledHarness.calls.length)) === count,
    'Preview wrote HID',
  );
  await apply();
  await page
    .getByText('Compañero guardado en el teclado.', {exact: true})
    .waitFor();
  check(
    (await page.evaluate(() => window.oledHarness.state())).storedMode === 1,
    'Not persisted',
  );
  results.push('Preview and welcome local; apply persisted and verified');

  await load();
  await page.evaluate(() => window.oledHarness.behavior('unsupported'));
  await page.getByRole('button', {name: 'Releer teclado'}).click();
  await page.getByText(/El firmware no admite/).waitFor();
  await choose('Firma');
  check(
    await page.getByRole('button', {name: 'Aplicar y guardar'}).isDisabled(),
    'Unsupported apply',
  );
  check(
    await page.evaluate(() =>
      window.oledHarness.calls.every((c) => c.op === 'get'),
    ),
    'Unsupported write',
  );
  results.push('Old firmware remains read-only with previews');

  await load();
  await page.evaluate(() => window.oledHarness.protocol(1));
  await page.getByRole('button', {name: 'Releer teclado'}).click();
  await page.getByText('En el teclado:').waitFor();
  check(await power().isDisabled(), 'V1 power toggle must be disabled');
  await choose('Firma');
  await apply();
  await page
    .getByText('Firma guardado en el teclado.', {exact: true})
    .waitFor();
  check(
    await page.evaluate(
      () => !window.oledHarness.calls.some((c) => c.bytes?.[1] === 0x72),
    ),
    'V1 received toggle command',
  );
  results.push('V1 keeps mode control and disables unsupported power toggle');

  await load();
  await page.evaluate(() => window.oledHarness.behavior('mismatch'));
  await power().uncheck();
  await apply();
  await page.getByRole('alert').waitFor();
  check(
    !(await page.locator('body').innerText()).includes(
      'Pantalla apagada y guardada en el teclado.',
    ),
    'False power success',
  );
  check(
    await page.getByRole('button', {name: 'Aplicar y guardar'}).isDisabled(),
    'Power mismatch missing reread',
  );
  results.push('Power persistence mismatch never reports success');

  await load();
  await page.evaluate(() => window.oledHarness.behavior('mismatch'));
  await choose('Compañero');
  await apply();
  await page.getByRole('alert').waitFor();
  check(
    !(await page.locator('body').innerText()).includes(
      'Compañero guardado en el teclado.',
    ),
    'False success',
  );
  check(
    await page.getByRole('button', {name: 'Aplicar y guardar'}).isDisabled(),
    'Missing recovery read',
  );
  results.push(
    'Persistence mismatch requires reread and never reports success',
  );

  await load();
  await choose('Firma');
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(
      (e) => e.textContent === 'Aplicar y guardar',
    );
    button.click();
    button.click();
  });
  await page.getByText('Firma guardado en el teclado.').waitFor();
  check(
    (await page.evaluate(
      () =>
        window.oledHarness.calls.filter(
          (c) => c.op === 'set' && c.bytes[1] === 0x71,
        ).length,
    )) === 1,
    'Double apply',
  );
  results.push('Double click serializes');

  await load();
  await power().uncheck();
  await page.evaluate(() => window.oledHarness.pause('power'));
  await apply();
  await page.waitForFunction(() => window.oledHarness.pending.length === 1);
  await page.evaluate(() => window.oledHarness.select('A', false));
  await page
    .getByText('Conecta tu Zelvoq 60 Plus para configurar la pantalla.')
    .waitFor();
  await page.evaluate(() => window.oledHarness.release());
  check(
    await page.evaluate(
      () => !window.oledHarness.calls.some((c) => c.op === 'save'),
    ),
    'Disconnected power was saved',
  );
  const interrupted = await page.evaluate(() => window.oledHarness.state());
  check(
    interrupted.enabled === false && interrupted.storedEnabled === true,
    'Live off and stored on must remain distinct',
  );
  check(
    !(await page.locator('body').innerText()).includes(
      'Pantalla apagada y guardada en el teclado.',
    ),
    'Disconnected power reported success',
  );
  await page.evaluate(() => window.oledHarness.select('A', true));
  await page.getByText('En el teclado:').waitFor();
  check(!(await power().isChecked()), 'Reconnect did not read live power');
  check(
    await page.getByRole('button', {name: 'Aplicar y guardar'}).isEnabled(),
    'Unstored off could not be saved after reread',
  );
  results.push(
    'Disconnect after live power SET cancels SAVE and rereads actual unsaved state',
  );

  for (const stage of ['get', 'set']) {
    await load();
    await choose('Firma');
    await page.evaluate((value) => window.oledHarness.pause(value), stage);
    await apply();
    await page.waitForFunction(() => window.oledHarness.pending.length === 1);
    await page.evaluate(() => window.oledHarness.select('B'));
    await page.waitForFunction(() =>
      window.oledHarness.calls.some((c) => c.key === 'B'),
    );
    await page.evaluate(() => window.oledHarness.release());
    await page.getByText('En el teclado:').waitFor();
    const calls = await page.evaluate(() => window.oledHarness.calls);
    check(
      !calls.some((c) => c.key === 'A' && c.op === 'save'),
      'Old device saved',
    );
    if (stage === 'get')
      check(
        !calls.some((c) => c.key === 'A' && c.op === 'set'),
        'Old device set',
      );
    results.push(`Device switch during ${stage} cancels remaining writes`);
  }

  await load();
  await choose('Firma');
  await page.evaluate(() => window.oledHarness.pause('get'));
  await apply();
  await page.waitForFunction(() => window.oledHarness.pending.length === 1);
  await page.evaluate(() => window.oledHarness.select('B'));
  await page.waitForFunction(() =>
    window.oledHarness.calls.some((c) => c.key === 'B'),
  );
  await page.evaluate(() => window.oledHarness.select('A'));
  await page.waitForFunction(
    () => window.oledHarness.calls.filter((c) => c.key === 'A').length >= 3,
  );
  await page.evaluate(() => window.oledHarness.release());
  await page.getByText('En el teclado:').waitFor();
  check(
    await page.evaluate(() =>
      window.oledHarness.calls.every((c) => c.op === 'get'),
    ),
    'ABA stale write',
  );
  results.push('A-B-A never revives old apply');

  await page.evaluate(() => window.oledHarness.select('A', false));
  await page
    .getByText('Conecta tu Zelvoq 60 Plus para configurar la pantalla.')
    .waitFor();
  check(
    await page.getByRole('button', {name: 'Aplicar y guardar'}).isDisabled(),
    'Disconnected apply',
  );
  check(await power().isDisabled(), 'Disconnected power toggle');
  await page.evaluate(() => window.oledHarness.select('A', true));
  await page.getByText('En el teclado:').waitFor();
  results.push('Reconnect rereads device');
  for (const width of [320, 375, 1280]) {
    await page.setViewportSize({width, height: 1000});
    check(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      `Overflow at ${width}`,
    );
    check(
      await page.evaluate(() =>
        [...document.querySelectorAll('img')].every(
          (i) => i.complete && i.naturalWidth === 128,
        ),
      ),
      'Missing preview',
    );
    results.push(`Fits ${width}px`);
  }
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.waitForFunction(() =>
    document.querySelector('picture img')?.currentSrc.endsWith('.png'),
  );
  check(
    await page
      .locator('picture img')
      .evaluate((i) => i.currentSrc.endsWith('.png')),
    'Motion still animates',
  );
  results.push('Reduced motion uses static preview');
  return results;
}

/** Split controls must probe old firmware and apply one setting to the pair. */
export async function runSplitOledBrowserChecks(page, base = 'http://127.0.0.1:4177') {
  const results = [];
  const check = (value, message) => { if (!value) throw Error(message); };
  for (const model of ['corne', 'sofle', 'lily58']) {
    await page.goto(`${base}/configurador/tests/oled-harness.html?fresh=1&model=${model}`);
    await page.getByText('En el teclado:').waitFor();
    const power = page.getByRole('checkbox', {name: 'Pantallas encendidas', exact: true});
    const apply = page.getByRole('button', {name: 'Aplicar y guardar'});
    check(await power.isChecked(), `${model}: expected power on`);
    const primaryLabel = model === 'corne' ? 'Capa y WPM · USB' : 'Mitad con USB';
    const secondaryLabel = model === 'corne' ? 'Modelo + animación' : 'Otra mitad';
    check(await page.getByText(primaryLabel, {exact:true}).isVisible(), `${model}: primary missing`);
    check(await page.getByText(secondaryLabel, {exact:true}).isVisible(), `${model}: secondary missing`);
    await page.waitForFunction(() => [...document.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0));
    const baseline = await page.evaluate(() => window.oledHarness.calls.length);
    await page.getByRole('button', {name: /^Compañero/}).click();
    check((await page.evaluate(() => window.oledHarness.calls.length)) === baseline, `${model}: preview wrote HID`);
    await power.uncheck();
    check(await page.getByRole('img', {name: `${primaryLabel} apagada`, exact: true}).isVisible(), `${model}: primary off preview missing`);
    check(await page.getByRole('img', {name: `${secondaryLabel} apagada`, exact: true}).isVisible(), `${model}: secondary off preview missing`);
    await apply.click();
    await page.getByText('Pantallas apagadas y guardadas en el teclado.', {exact:true}).waitFor();
    check((await page.evaluate(() => window.oledHarness.state())).storedEnabled === false, `${model}: power not saved`);
    await page.reload();
    await page.getByText('En el teclado:').waitFor();
    check(!(await power.isChecked()), `${model}: power lost on reload`);
    await power.check();
    await page.getByRole('button', {name: /^Firma/}).click();
    await apply.click();
    await page.getByText('Firma guardado en el teclado.', {exact:true}).waitFor();
    await page.evaluate(() => window.oledHarness.behavior('unsupported'));
    await page.getByRole('button', {name:'Releer teclado'}).click();
    await page.getByText(/El firmware no admite/).waitFor();
    const reads = await page.evaluate(() => window.oledHarness.calls.length);
    await page.getByRole('button', {name: /^Pulso/}).click();
    check(await apply.isDisabled(), `${model}: unsupported apply enabled`);
    check(await power.isDisabled(), `${model}: unsupported power enabled`);
    check((await page.evaluate(() => window.oledHarness.calls.length)) === reads, `${model}: unsupported preview wrote`);
    for (const width of [320, 1280]) {
      await page.setViewportSize({width, height:1000});
      check(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${model}: overflow ${width}`);
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(() => [...document.querySelectorAll('picture img')].every(i => i.currentSrc.endsWith('.png')));
    await page.emulateMedia({reducedMotion:'no-preference'});
    results.push(`${model}: both screens preview locally; power/mode persist; old firmware read-only; mobile/desktop/reduced motion fit`);
  }
  return results;
}

/** Exercise actual app menus/KeyboardAPI with the isolated WebHID fixture. */
export async function runSplitLightingBrowserChecks(page, fixtureSource, base = 'http://127.0.0.1:4177') {
  const results = [];
  const check = (value, message) => { if (!value) throw Error(message); };
  for (const model of ['corne','sofle','lily58']) {
    for (const legacy of [false,true]) {
      const isolated = await page.context().newPage();
      try {
        const fixture = {model, supported: !legacy};
        await isolated.addInitScript({content: `window.__oledFixture=${JSON.stringify(fixture)};\n${fixtureSource}`});
        await isolated.goto(`${base}/configurador/`);
        await isolated.locator('svg[data-icon="lightbulb"]').waitFor();
        await isolated.locator('svg[data-icon="lightbulb"]').click();
        await isolated.getByRole('combobox').waitFor();
        await isolated.getByRole('combobox').click();
        const labels = await isolated.getByRole('option').allTextContents();
        if (legacy) {
          check(labels.some(label => model === 'corne' ? label === 'Typing Heatmap' : label === 'Snake 1'), `${model}: old firmware menu changed`);
          check(await isolated.evaluate(() => window.__oledHidMock.calls.every(c => c[0] !== 7 && c[0] !== 9)), `${model}: probe wrote HID`);
        } else {
          const expected = model === 'corne' ? 8 : model === 'sofle' ? 27 : 25;
          check(labels.length === expected, `${model}: ${labels.length} effects instead of ${expected}`);
          check(!labels.some(label=>/Heatmap|Snake|Knight|Christmas|Twinkle/.test(label)), `${model}: unavailable effect offered`);
          const target = model === 'corne' ? 'Solid Reactive Simple' : 'Gradient 1';
          const value = model === 'corne' ? 6 : 15;
          await isolated.getByRole('option',{name:target,exact:true}).click();
          await isolated.waitForFunction(expected => window.__oledHidMock.model.rgbEffect === expected, value);
          check(await isolated.evaluate(({value,channel}) => window.__oledHidMock.calls.some(c=>c[0]===7 && c[1]===channel && c[2]===2 && c[3]===value), {value,channel:model === 'corne' ? 3 : 2}), `${model}: effect did not use compiled enum`);
          if (model === 'sofle') {
            await isolated.getByRole('combobox').click();
            await isolated.getByRole('option',{name:'RGB Test',exact:true}).click();
            await isolated.waitForFunction(()=>window.__oledHidMock.model.rgbEffect===25);
            check(await isolated.getByText('Color',{exact:true}).count() === 0, 'Sofle: test mode color control still visible');
          }
        }
        results.push(`${model} ${legacy ? 'legacy' : 'OLED v2'}: ${labels.length} correctly gated effects; HID enum values verified`);
      } finally { await isolated.close(); }
    }
  }
  return results;
}
