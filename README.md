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
definiciones de Corne y Lily58. La Plus incorpora además un panel Pantalla con previsualización de sus modos OLED.

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

## Pantalla OLED de la Plus

La sección **Pantalla** permite elegir Pulso, Compañero o Firma, previsualizar
la bienvenida y pulsar **Aplicar y guardar**. La app confirma el modo activo
y el leído de EEPROM. Las vistas previas son locales, con actividad de ejemplo.

Requiere firmware Plus con protocolo OLED v1. La app lo comprueba antes de
escribir; un firmware anterior mantiene las vistas previas pero pide actualizar
para habilitar Aplicar. No hace falta remapear una tecla ni resetear VIA.

Se reutiliza la conexión VIA y su cola: canal custom0, GETcap70, GET/SETmode71
y SAVE. No se escriben RGB, keymaps o macros. Los errores/desconexiones no
se presentan como guardado correcto, y cambiar de dispositivo cancela las
operaciones pendientes de esa selección.

Pruebas: `npm test` incluye protocolo y carreras de sesión. Para probar el
componente en navegador aislado, levantar Vite y ejecutar
`runOledBrowserChecks(page)` de `tests/oled.browser.mjs` con una página de
Playwright. `tests/oled-harness.html` simula la API; `oled-webhid-mock.js` se
inyecta con `page.addInitScript` para comprobar la app completa y KeyboardAPI
contra reportes HID de32bytes. Estos fixtures no se incluyen en dist ni acceden
al dispositivo real. La carga del nuevo firmware y su persistencia física
se validan aparte.

## Definiciones administradas por Zelvoq

El build público no incluye la sección Diseño, el editor/cargador de JSON ni
la opción para habilitarlo. Tampoco carga borradores de definiciones guardados
anteriormente en el navegador; se conservan esos datos sin borrarlos. El
cliente configura teclas, capas, macros, luces y pantalla con las definiciones
incluidas automáticamente.

Las definiciones se mantienen internamente en `zelvoq/definitions/`, pasan
por `zelvoq-definitions` y se publican con un build revisado. El código fuente
upstream del editor permanece para mantenimiento interno, sin ruta ni controles
en la aplicación pública.
