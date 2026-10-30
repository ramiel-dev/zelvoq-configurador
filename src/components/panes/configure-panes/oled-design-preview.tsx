import React from 'react';
import {OLED_MODES} from '../../../utils/zelvoq-oled';
import type {OledMode, OledModel} from '../../../utils/zelvoq-oled';

export const OLED_PREVIEW_FILES = ['pulso', 'companion', 'signature'] as const;

export function OledDesignPreview({
  assetBase,
  model,
  mode,
  enabled,
  welcome,
}: {
  assetBase: string;
  model: OledModel;
  mode: OledMode;
  enabled: boolean;
  welcome: boolean;
}) {
  const image = welcome ? 'welcome' : OLED_PREVIEW_FILES[mode];
  const screen = (part?: 'primary' | 'secondary') => {
    const imagePath = part ? `split/${model}/${part}-${image}` : image;
    const name =
      part === 'primary'
        ? 'Capa y WPM · USB'
        : part === 'secondary'
          ? 'Modelo + animación'
          : 'Pantalla';
    return (
      <figure>
        {part && <figcaption>{name}</figcaption>}
        {!enabled ? (
          <div className="off" role="img" aria-label={`${name} apagada`} />
        ) : (
          <picture key={imagePath}>
            <source
              media="(prefers-reduced-motion: reduce)"
              srcSet={`${assetBase}${imagePath}.png`}
            />
            <img
              src={`${assetBase}${imagePath}.gif`}
              width={128}
              height={32}
              alt={
                welcome
                  ? `Bienvenida Zelvoq · ${name}`
                  : `${name} · vista previa de ${OLED_MODES[mode]}`
              }
            />
          </picture>
        )}
      </figure>
    );
  };
  return model === 'plus' ? (
    screen()
  ) : (
    <div className="screens">
      {screen('primary')}
      {screen('secondary')}
    </div>
  );
}
