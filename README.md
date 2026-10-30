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

## Pantallas OLED

La sección **Pantalla** permite elegir Pulso, Compañero o Firma, previsualizar
la bienvenida y pulsar **Aplicar y guardar**. La app confirma el modo activo
y el leído de EEPROM. Las vistas previas son locales, con actividad de ejemplo.

Compatible con Zelvoq 60 Plus y los Corne, Sofle v1 y Lily58 cableados con
firmware OLED Zelvoq. En los splits, la mitad conectada por USB muestra capa,
velocidad y modificadores; la otra muestra Pulso, Compañero o la firma de marca.
En los tres modelos, esa segunda pantalla se divide en dos áreas de 64×32: modelo y
Pulso, la misma mascota del Zelvoq Plus o Firma. Con USB en la izquierda,
capa/WPM quedan a la izquierda y modelo/diseño a la derecha. Sofle conserva
el estado horizontal con tres dígitos grandes, igual que Corne y Lily58. Al cambiar el
USB de lado, los roles siguen la conexión. El interruptor **Pantallas
encendidas** controla las dos juntas. Se eligen diseños incluidos; no hay
editor ni carga de imágenes propias.

La app comprueba el protocolo antes de escribir. Un firmware anterior mantiene
las vistas previas y pide actualizar para habilitar Aplicar. El protocolo v2
permite guardar modo y encendido; v1 conserva el control de modo. No hace falta
remapear una tecla ni resetear VIA.

Se reutiliza la conexión VIA y su cola: canal custom0, GETcap70, GET/SETmode71
GET/SETpower72 y SAVE. Los controles de pantalla no escriben RGB, keymaps o macros.

En estos tres splits, la firma OLED habilita un catálogo RGB compatible: Corne expone los siete efectos compartidos por sus builds OLED; Sofle conserva respiración, Rainbow Mood y Rainbow Swirl; Lily58 conserva respiración, arcoíris y
gradientes. La lista cambia solo tras validar la firma OLED v2; el firmware
anterior sin esa firma conserva sus menús. Algunos Corne OLED v2 anteriores
incluyen además Multi Nexus/Splash/Solid Splash: el menú usa el subconjunto
común de siete, cuyos IDs no cambiaron. Sofle usa el subconjunto 1–14,
compartido con sus builds OLED anteriores; Gradient, RGB Test y Alternating
se retiraron del firmware nuevo para priorizar sus pantallas. Un error de lectura oculta únicamente el menú RGB
hasta reconectar y permite seguir configurando las otras funciones. Los errores/desconexiones no
se presentan como guardado correcto, y cambiar de dispositivo cancela las
operaciones pendientes de esa selección.

Pruebas: `npm test` incluye protocolo y carreras de sesión. Para probar el
componente en navegador aislado, levantar Vite y ejecutar
`runOledBrowserChecks(page)` y `runSplitOledBrowserChecks(page)` de
`tests/oled.browser.mjs` con una página de
Playwright. `runSplitLightingBrowserChecks(page, fixtureSource)` comprueba los
menús RGB de los tres modelos y sus versiones anteriores en la app completa.
`tests/oled-harness.html` simula la API; `oled-webhid-mock.js` se
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

## Panel de pantalla

La pestaña Pantalla comparte una vista previa enmarcada, selector de diseños,
interruptor de encendido y estado de cambios pendientes para Corne, Sofle,
Lily58 y Zelvoq 60 Plus. Respeta los temas claro/oscuro y movimiento reducido.
La selección se previsualiza en el navegador; solo **Aplicar y guardar** cambia
el teclado y verifica la persistencia.
