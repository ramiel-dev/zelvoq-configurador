/** Run with an isolated Playwright page against the Vite dev server. */
export async function runOledBrowserChecks(page, base = 'http://127.0.0.1:4176') {
  const check = (value, message) => { if (!value) throw Error(message); };
  const results = [];
  await page.bringToFront();
  const load = async () => {
    await page.goto(`${base}/configurador/tests/oled-harness.html`);
    await page.getByText('En el teclado:').waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('img')].every(i => i.complete && i.naturalWidth === 128));
  };
  const choose = name => page.getByRole('button', {name: new RegExp(`^${name}`)}).click();
  const apply = () => page.getByRole('button', {name: 'Aplicar y guardar'}).click();
  await load();
  const count = await page.evaluate(() => window.oledHarness.calls.length);
  await choose('Compañero');
  await page.getByRole('button', {name: 'Ver bienvenida', exact: true}).click();
  check(await page.evaluate(() => window.oledHarness.calls.length) === count, 'Preview wrote HID');
  await apply();
  await page.getByText('Compañero guardado en el teclado.', {exact: true}).waitFor();
  check((await page.evaluate(() => window.oledHarness.state())).storedMode === 1, 'Not persisted');
  results.push('Preview and welcome local; apply persisted and verified');

  await load();
  await page.evaluate(() => window.oledHarness.behavior('unsupported'));
  await page.getByRole('button', {name: 'Releer teclado'}).click();
  await page.getByText(/El firmware no admite/).waitFor();
  await choose('Firma');
  check(await page.getByRole('button', {name: 'Aplicar y guardar'}).isDisabled(), 'Unsupported apply');
  check(await page.evaluate(() => window.oledHarness.calls.every(c => c.op === 'get')), 'Unsupported write');
  results.push('Old firmware remains read-only with previews');

  await load();
  await page.evaluate(() => window.oledHarness.behavior('mismatch'));
  await choose('Compañero');
  await apply();
  await page.getByRole('alert').waitFor();
  check(!(await page.locator('body').innerText()).includes('Compañero guardado en el teclado.'), 'False success');
  check(await page.getByRole('button', {name: 'Aplicar y guardar'}).isDisabled(), 'Missing recovery read');
  results.push('Persistence mismatch requires reread and never reports success');

  await load();
  await choose('Firma');
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(e => e.textContent === 'Aplicar y guardar');
    button.click(); button.click();
  });
  await page.getByText('Firma guardado en el teclado.').waitFor();
  check(await page.evaluate(() => window.oledHarness.calls.filter(c => c.op === 'set').length) === 1, 'Double apply');
  results.push('Double click serializes');

  for (const stage of ['get', 'set']) {
    await load(); await choose('Firma');
    await page.evaluate(value => window.oledHarness.pause(value), stage);
    await apply();
    await page.waitForFunction(() => window.oledHarness.pending.length === 1);
    await page.evaluate(() => window.oledHarness.select('B'));
    await page.waitForFunction(() => window.oledHarness.calls.some(c => c.key === 'B'));
    await page.evaluate(() => window.oledHarness.release());
    await page.getByText('En el teclado:').waitFor();
    const calls = await page.evaluate(() => window.oledHarness.calls);
    check(!calls.some(c => c.key === 'A' && c.op === 'save'), 'Old device saved');
    if (stage === 'get') check(!calls.some(c => c.key === 'A' && c.op === 'set'), 'Old device set');
    results.push(`Device switch during ${stage} cancels remaining writes`);
  }

  await load(); await choose('Firma');
  await page.evaluate(() => window.oledHarness.pause('get')); await apply();
  await page.waitForFunction(() => window.oledHarness.pending.length === 1);
  await page.evaluate(() => window.oledHarness.select('B'));
  await page.waitForFunction(() => window.oledHarness.calls.some(c => c.key === 'B'));
  await page.evaluate(() => window.oledHarness.select('A'));
  await page.waitForFunction(() => window.oledHarness.calls.filter(c => c.key === 'A').length >= 3);
  await page.evaluate(() => window.oledHarness.release());
  await page.getByText('En el teclado:').waitFor();
  check(await page.evaluate(() => window.oledHarness.calls.every(c => c.op === 'get')), 'ABA stale write');
  results.push('A-B-A never revives old apply');

  await page.evaluate(() => window.oledHarness.select('A', false));
  await page.getByText('Conecta tu Zelvoq 60 Plus para configurar la pantalla.').waitFor();
  check(await page.getByRole('button', {name: 'Aplicar y guardar'}).isDisabled(), 'Disconnected apply');
  await page.evaluate(() => window.oledHarness.select('A', true));
  await page.getByText('En el teclado:').waitFor();
  results.push('Reconnect rereads device');
  for (const width of [320, 375, 1280]) {
    await page.setViewportSize({width, height: 1000});
    check(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `Overflow at ${width}`);
    check(await page.evaluate(() => [...document.querySelectorAll('img')].every(i => i.complete && i.naturalWidth === 128)), 'Missing preview');
    results.push(`Fits ${width}px`);
  }
  await page.emulateMedia({reducedMotion: 'reduce'});
  check(await page.locator('picture img').evaluate(i => i.currentSrc.endsWith('.png')), 'Motion still animates');
  results.push('Reduced motion uses static preview');
  return results;
}
