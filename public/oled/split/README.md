# Vistas previas de los splits

Capturas del renderer C compartido y la fuente compacta de cada firmware.
Cada PNG representa el primer frame del GIF. La mitad con USB muestra estado;
la segunda muestra el diseño. Sofle conserva su pantalla principal vertical.

Las capturas usan capa 2, 72 WPM y Shift como actividad de ejemplo. No son
lecturas del teclado conectado ni prueban la orientación física del montaje.

Se regeneran desde el repositorio de firmware con:

```sh
python3 firmware/split-oled/tools/render-previews.py /ruta/al/configurador/public/oled/split
```

El script compila `tests/capture-oled.c` con el módulo y la fuente reales y
convierte su framebuffer de 512 bytes en PNG y GIF. Requiere un compilador C
y Pillow. Los fixtures y scripts de captura no forman parte del firmware.
