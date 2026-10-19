# Configurador Zelvoq

Build propio de [VIA](https://github.com/the-via/app) (GPL-3.0) para
`keyboards.zelvoq.cl`, con las definiciones de teclado corregidas.

## Por que existe

VIA no decide el panel de iluminacion por lo que soporte el firmware, sino por
la **definicion del teclado** que descarga segun el VID/PID. Las oficiales no
cuadran con el firmware de Zelvoq:

| Teclado | Oficial declara | Resultado |
|---|---|---|
| Corne | `menus: ["qmk_rgblight"]` | panel de luz **vacio**: el firmware responde por el canal de RGB_MATRIX |
| Lily58 | sin `menus` | **sin controles de luz**, para todo el mundo |

Se puede pedir a cada comprador que cargue un JSON en la pestaña Design, pero
eso no es una experiencia de producto. Esto sirve las definiciones correctas
desde el arranque.

## Cambios respecto a upstream

Son pocos y deliberadamente superficiales, para que rebasar contra upstream
siga siendo barato.

| Archivo | Cambio |
|---|---|
| `zelvoq/definitions/*.json` | **nuevo** — definiciones corregidas |
| `scripts/zelvoq-definitions.mjs` | **nuevo** — las vuelca sobre las oficiales tras `build:kbs` |
| `src/app.global.css` | paleta y tipografia de Zelvoq. Solo cambian **valores** de variables CSS; ningun componente se toca |
| `src/utils/themes.ts` | tema de teclas `ZELVOQ` |
| `src/utils/color-math.ts` | acento por defecto -> `ZELVOQ` |
| `src/utils/device-store.ts` | tema inicial -> `ZELVOQ` |
| `src/components/menus/external-links.tsx` | enlaces de VIA -> Zelvoq + atribucion |
| `src/components/chippy-loader.tsx` | el SVG de Chippy (mascota de VIA) -> marca de Zelvoq; circulo sobre fondo oscuro |
| `src/components/three-fiber/canvas-router.tsx` | Cubey (mascota 3D de VIA) oculta; marca de Zelvoq sobre el boton |
| `src/assets/images/zelvoq-mark.png` | **nuevo** — la marca, render 600x600 del favicon |
| `index.html` | titulo, idioma, meta, favicon |
| `public/favicon.svg` | **nuevo** — el del landing |

### Sobre las mascotas

VIA tiene dos y estan en sitios distintos, cosa que no es obvia:

- **Chippy** es un SVG **inline dentro de `chippy-loader.tsx`**, no el
  `chippy_600.png` que ese archivo importa (ese import queda sin usar en
  upstream). Es el que sale en modo de render **2D**, que es el por defecto.
- **Cubey** es un modelo **3D** (`assets/models/cubey.glb`) que renderiza
  `LoaderCubey`, y solo aparece en modo **3D**.

Hay que cambiar los dos: tocar solo uno deja la mascota de VIA a la vista
segun el modo de render que tenga el usuario.

## Construir

```bash
npm ci
node --import tsx node_modules/via-keyboards/scripts/build-all.ts public/definitions
node scripts/zelvoq-definitions.mjs
npx tsc --noEmit && npx vite build
```

El resultado queda en `dist/`, estatico. Upstream usa `bun`; con `npm` y Node
22 funciona igual, y el segundo paso es lo que `bun run build:kbs` hace por
dentro.

Para actualizar definiciones de upstream: `npm update via-keyboards` y repetir.

## Obligaciones que NO son opcionales

- **GPL-3.0.** Servir este JavaScript modificado al navegador es distribuirlo,
  asi que el codigo de este fork debe estar publicado y enlazado desde la app.
  El enlace de GitHub del header apunta ahi; **si cambia la URL del repo, hay
  que actualizarlo**.
- **Marca.** La GPL cubre el codigo, no el nombre. Esto no se llama VIA, no usa
  su logo y no insinua afiliacion.

## Limitacion que conviene decir en la pagina

**WebHID solo existe en navegadores Chromium**: Chrome, Edge, Opera. Firefox y
Safari no pueden conectar con el teclado, ni con permisos. Ya pasa con
usevia.app, pero hospedandolo nosotros pasa a ser soporte nuestro.
