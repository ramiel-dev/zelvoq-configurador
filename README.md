# Configurador Zelvoq

Aplicacion web para configurar teclados [Zelvoq](https://zelvoq.cl) desde el
navegador: reasignar teclas, crear capas y macros, y ajustar la iluminacion.
Los cambios se guardan en el teclado, no en el computador.

**Usalo en https://keyboards.zelvoq.cl/configurador/** — no hace falta instalar
ni compilar nada.

## Requisitos

Un navegador **Chromium**: Chrome, Edge, Brave u Opera. Firefox y Safari no
implementan WebHID y no pueden comunicarse con el teclado.

El teclado debe tener firmware compatible con VIA. Los que vendemos vienen con
el, y la aplicacion los reconoce al conectarlos.

## Licencia y origen

Este es un fork de [the-via/app](https://github.com/the-via/app), el
configurador VIA, distribuido bajo **GPL-3.0**. Partimos del commit
`935106a990af39bdd1ade881c02366eac486240d`.

Se conservan la autoria original y el texto integro de `LICENSE`. **No existe
afiliacion con VIA ni con su equipo**; el nombre y el logo de VIA son suyos y
no se usan aqui.

Existe porque las definiciones oficiales de VIA no describen la iluminacion de
nuestros teclados, asi que el panel de luces salia vacio. Este build corrige las
definiciones de Corne y Lily58. Todo lo demas es VIA.

Si redistribuyes una version modificada, la GPL-3.0 te obliga a publicar su
codigo y sus scripts de build.

## Compilar

Node.js 22.

```sh
npm ci --ignore-scripts
npm run build
```

El resultado queda en `dist/`, listo para servir como sitio estatico bajo la
ruta `/configurador/`. Requiere HTTPS: WebHID no funciona sin contexto seguro.

Para desarrollo:

```sh
npm run dev
```

y abrir http://localhost:5173/configurador/.

## Problemas

Si el teclado no aparece o algo no responde, escribenos a
[zelvoq.cl](https://zelvoq.cl). Incluye el modelo y el navegador que usas.
