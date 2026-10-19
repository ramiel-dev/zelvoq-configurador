// Sobrescribe las definiciones oficiales con las de Zelvoq.
//
// Se ejecuta DESPUES de build:kbs, que vuelca las definiciones oficiales en
// public/definitions/v3/<id>.json, donde <id> = vendorId * 65536 + productId.
//
// Hace falta porque las oficiales no cuadran con nuestro firmware:
//   - Corne  declara menus ["qmk_rgblight"] y el firmware responde por el
//     canal de RGB_MATRIX, asi que VIA muestra el panel de luz vacio.
//   - Lily58 no declara ningun menu, asi que VIA nunca muestra controles.
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

import {createHash} from 'node:crypto';

const output = process.argv[2] || 'public/definitions';
const source = process.argv[3] || 'zelvoq/definitions';
const readJSON = (path) => JSON.parse(readFileSync(path, 'utf8'));
const index = readJSON(join(output, 'supported_kbs.json'));
const overrides = readdirSync(source)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => {
    const definition = readJSON(join(source, file));
    const ids = [Number(definition.vendorId), Number(definition.productId)];
    if (!ids.every((id) => Number.isInteger(id) && id >= 0 && id <= 65535))
      throw new Error(`VID/PID inválido: ${file}`);
    return {id: ids[0] * 65536 + ids[1], definition};
  });
if (new Set(overrides.map(({id}) => id)).size !== overrides.length)
  throw new Error('VID/PID duplicado en overrides');
const updated = {
  ...index,
  vendorProductIds: {
    ...index.vendorProductIds,
    v3: [
      ...new Set([
        ...index.vendorProductIds.v3,
        ...overrides
          .filter(({id}) => !index.vendorProductIds.v2.includes(id))
          .map(({id}) => id),
      ]),
    ],
  },
};
for (const {id, definition} of overrides)
  writeFileSync(join(output, 'v3', `${id}.json`), JSON.stringify(definition));
writeFileSync(join(output, 'supported_kbs.json'), JSON.stringify(updated));
// El timestamp no altera contenido; el índice y las definiciones finales sí.
const hash = createHash('sha256').update(
  JSON.stringify({...updated, generatedAt: undefined}),
);
for (const version of ['v2', 'v3']) {
  for (const file of readdirSync(join(output, version))
    .filter((name) => name.endsWith('.json'))
    .sort()) {
    hash
      .update(`${version}/${file}\0`)
      .update(readFileSync(join(output, version, file)));
  }
}
writeFileSync(join(output, 'hash.json'), JSON.stringify(hash.digest('hex')));
console.log(
  `${overrides.length} definiciones Zelvoq aplicadas; índice y hash actualizados`,
);
