// Sobrescribe las definiciones oficiales con las de Zelvoq.
//
// Se ejecuta DESPUES de build:kbs, que vuelca las definiciones ya transformadas
// en public/definitions/v3/<id>.json, donde <id> = vendorId * 65536 + productId.
//
// Hace falta porque las oficiales no cuadran con nuestro firmware:
//   - Corne  declara menus ["qmk_rgblight"] y el firmware responde por el
//     canal de RGB_MATRIX, asi que VIA muestra el panel de luz vacio.
//   - Lily58 no declara ningun menu, asi que VIA nunca muestra controles.
//
// IMPORTANTE: lo que se publica NO es el JSON fuente. La app espera la
// definicion ya transformada por el reader: con vendorProductId en vez de
// vendorId/productId, y con layouts.keys / layouts.optionKeys parseados desde
// el KLE de layouts.keymap. Copiar el fuente tal cual deja layouts.keys sin
// definir y la app revienta en definitionsSlice.ts al hacer keys.concat().
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';

const require = createRequire(import.meta.url);
const {keyboardDefinitionV3ToVIADefinitionV3, isKeyboardDefinitionV3} =
  require('@the-via/reader');

const ORIGEN = 'zelvoq/definitions';
const DESTINO = 'public/definitions/v3';

let n = 0;
for (const archivo of readdirSync(ORIGEN).filter((f) => f.endsWith('.json'))) {
  const fuente = JSON.parse(readFileSync(join(ORIGEN, archivo), 'utf8'));

  if (!isKeyboardDefinitionV3(fuente)) {
    throw new Error(
      `${archivo} no es una definicion V3 valida; revisar antes de publicar.`,
    );
  }

  const via = keyboardDefinitionV3ToVIADefinitionV3(fuente);
  const destino = join(DESTINO, `${via.vendorProductId}.json`);

  let antes = null;
  try {
    antes = JSON.parse(readFileSync(destino, 'utf8')).menus;
  } catch {
    // No existia una definicion oficial para ese VID/PID; se añade.
  }

  writeFileSync(destino, JSON.stringify(via));
  console.log(
    `  ${archivo}  ->  ${via.vendorProductId}.json   menus ` +
      `${JSON.stringify(antes)} -> ${JSON.stringify(via.menus)}` +
      `   layouts: ${Object.keys(via.layouts).join(', ')}`,
  );
  n++;
}
console.log(`${n} definiciones de Zelvoq aplicadas`);
