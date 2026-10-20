# Configurador Zelvoq

Fork de [the-via/app](https://github.com/the-via/app), distribuido bajo GPL-3.0.
Base copiada: commit upstream `935106a990af39bdd1ade881c02366eac486240d`
(Suppress errors for optional board name index lookup). Se conservan la autoría
original y el texto íntegro de LICENSE. No hay afiliación con VIA.
Código del fork: https://github.com/ramiel-dev/zelvoq-configurador.

Modificaciones Zelvoq: 19 de octubre de 2026. Esta distribución conserva los
avisos de autoría del código upstream; la marca, integración `/configurador/`, scripts,
correcciones de almacenamiento y definiciones locales son cambios del fork.

## Desarrollo y build

Usar Node.js 22 y npm. Desde este repositorio independiente:

```sh
npm ci --ignore-scripts
npm test
npm run dev
```

Abrir http://localhost:5173/configurador/. Dev genera primero las definiciones upstream
y aplica los overrides locales. No requiere Bun ni un checkout hermano.

```sh
npm run build
npm run test:dist
npm run preview
```

Build ejecuta en orden build:kbs → zelvoq-definitions → typecheck → Vite.
El lock npm fija via-keyboards a 904b42c4195dc25683db1483d960e9c075889e7c.
No se actualizan dependencias durante el build. Para actualizar deliberadamente,
usar npm run refresh-kbs y revisar el lock y las definiciones resultantes.
El symlink temporal node_modules no forma parte del repositorio.
La instalación limpia requiere acceso al registro npm y al repositorio de teclados.
El timestamp generado por upstream varía; el hash de contenido excluye ese timestamp.

## Hosting en /configurador/

Servir el contenido de dist bajo /configurador/, con HTTPS para WebHID. Vite usa base
/configurador/ y wouter base /configurador; las descargas de definiciones respetan BASE_URL.
El build copia index.html solo a las rutas reales de pane-config y ErrorsPaneConfig
(test, design, console, settings, debug, errors), permitiendo refrescar /configurador/test/.
El hosting debe resolver directorios a index.html. No se crean rutas ficticias
para los submenús de Configure. La CI valida y construye, sin publicar ni usar
secretos de despliegue. El despliegue requiere una acción explícita independiente.

## Cambios del fork y limitaciones

Marca y tema Zelvoq; overrides Corne/Lily58 en zelvoq/definitions; índice y hash
calculados sobre las definiciones finales sin alterar el contrato upstream.
LICENSE se conserva y public/LICENSE distribuye la misma licencia. La UI ofrece
aviso GPL, atribución a VIA y enlace al código fuente del fork. Al distribuir,
publicar el código correspondiente a la versión servida y sus scripts de build.
Ver zelvoq/README.md para el contexto de las definiciones y cambios de marca.

Las pruebas de software no verifican hardware: quedan por comprobar permisos
WebHID, VID/PID reales, matriz, keymaps, macros e iluminación RGB_MATRIX con cada
firmware Corne/Lily58. Usar Chromium con soporte WebHID. No se flashea firmware.
