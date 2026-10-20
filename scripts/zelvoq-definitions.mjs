// Sobrescribe las definiciones oficiales con las de Zelvoq.
//
// Se ejecuta DESPUES de build:kbs, que vuelca las definiciones oficiales en
// public/definitions/v3/<id>.json, donde <id> = vendorId * 65536 + productId.
//
// Hace falta porque las oficiales no cuadran con nuestro firmware:
//   - Corne  declara menus ["qmk_rgblight"] y el firmware responde por el
//     canal de RGB_MATRIX, asi que VIA muestra el panel de luz vacio.
//   - Lily58 no declara ningun menu, asi que VIA nunca muestra controles.
//
// Lo que se publica NO es el JSON fuente: la app espera la definicion ya
// transformada por el reader, con vendorProductId en vez de vendorId/productId
// y con layouts.keys / optionKeys parseados desde el KLE de layouts.keymap.
// Copiar el fuente tal cual deja layouts.keys sin definir y la app revienta al
// conectar el teclado, en definitionsSlice.ts al hacer keys.concat().
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';

import {createHash} from 'node:crypto';

const {keyboardDefinitionV3ToVIADefinitionV3, isKeyboardDefinitionV3} =
  createRequire(import.meta.url)('@the-via/reader');

const output = process.argv[2] || 'public/definitions';
const source = process.argv[3] || 'zelvoq/definitions';
const readJSON = (path) => JSON.parse(readFileSync(path, 'utf8'));
const index = readJSON(join(output, 'supported_kbs.json'));
// Primero los chequeos baratos de identificador. Van antes de validar la forma
// completa para que un VID/PID repetido se reporte como tal y no como un error
// de esquema, que despista.
const fuentes = readdirSync(source)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => {
    const fuente = readJSON(join(source, file));
    const ids = [Number(fuente.vendorId), Number(fuente.productId)];
    if (!ids.every((id) => Number.isInteger(id) && id >= 0 && id <= 65535))
      throw new Error(`VID/PID inválido: ${file}`);
    return {file, fuente, id: ids[0] * 65536 + ids[1]};
  });
if (new Set(fuentes.map(({id}) => id)).size !== fuentes.length)
  throw new Error('VID/PID duplicado en overrides');

const overrides = fuentes.map(({file, fuente, id}) => {
  if (!isKeyboardDefinitionV3(fuente))
    throw new Error(`${file} no es una definición V3 válida`);
  return {id, definition: keyboardDefinitionV3ToVIADefinitionV3(fuente)};
});
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
