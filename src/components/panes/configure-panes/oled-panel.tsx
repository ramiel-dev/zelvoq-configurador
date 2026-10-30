import React, {useEffect, useMemo, useRef, useState} from 'react';
import styled from 'styled-components';
import {
  applyOledMode,
  applyOledSettings,
  OLED_MODES,
  readOledState,
  StaleOledSessionError,
  UnsupportedFirmwareError,
} from '../../../utils/zelvoq-oled';
import type {
  OledAPI,
  OledMode,
  OledState,
  OledModel,
} from '../../../utils/zelvoq-oled';
import {OledDesignPreview, OLED_PREVIEW_FILES} from './oled-design-preview';

const Surface = styled.section`
  color: var(--color_label-highlighted);
  background: var(--bg_menu);
  padding: 28px;
  min-height: 100%;
  box-sizing: border-box;
  h2 {
    color: inherit;
    margin: 0 0 8px;
    font-size: 24px;
  }
  p {
    font-size: 16px;
    line-height: 1.5;
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid var(--color_accent);
    outline-offset: 3px;
  }
  button:disabled {
    cursor: default;
    opacity: 0.5;
  }
`;
const Content = styled.div`
  max-width: 760px;
  margin: 0 auto;
`;
const Power = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  margin-top: 20px;
  font-size: 18px;
  input {
    width: 22px;
    height: 22px;
    accent-color: var(--color_accent);
  }
`;
const Preview = styled.div`
  background: #080b0a;
  border: 1px solid var(--border_color_cell);
  border-radius: 12px;
  padding: 24px;
  margin: 22px 0 8px;
  figure {
    margin: 0;
    min-width: 0;
  }
  figcaption {
    color: #c5d6ce;
    font-size: 14px;
    margin-bottom: 12px;
  }
  .screens {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: center;
    gap: 20px;
    text-align: center;
  }
  .portrait img,
  .portrait .off {
    max-width: 64px;
    aspect-ratio: 1 / 4;
    margin: auto;
  }
  .off {
    aspect-ratio: 4;
  }
  img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 4;
    image-rendering: pixelated;
  }
`;
const Designs = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 22px 0;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;
const Design = styled.button<{$selected: boolean}>`
  color: inherit;
  text-align: left;
  padding: 14px;
  border-radius: 9px;
  background: var(--bg_control);
  border: 2px solid
    ${({$selected}) => ($selected ? 'var(--color_accent)' : 'var(--border_color_cell)')};
  img {
    width: 100%;
    height: auto;
    aspect-ratio: 4;
    image-rendering: pixelated;
    display: block;
    margin-bottom: 12px;
  }
  strong {
    display: block;
    margin-bottom: 5px;
  }
  span {
    display: block;
    font-size: 14px;
    line-height: 1.4;
  }
`;
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
  button {
    padding: 10px 18px;
    border-radius: 7px;
    border: 1px solid var(--color_accent);
    color: inherit;
    background: transparent;
    min-height: 44px;
  }
  button:first-child {
    color: var(--color_inside-accent);
    background: var(--color_accent);
  }
`;
const PreviewAction = styled.button`
  color: inherit;
  background: transparent;
  border: 1px solid var(--border_color_cell);
  border-radius: 6px;
  padding: 8px 12px;
  min-height: 40px;
`;

const descriptions = [
  'Una firma de marca que sigue tu ritmo de escritura.',
  'Un pequeño compañero que reacciona mientras escribes.',
  'Logo Zelvoq y estado del teclado en una vista sobria.',
] as const;
const corneDescriptions = [
  'El modelo ocupa media pantalla; tu ritmo de escritura, la otra media.',
  'El modelo junto al mismo compañero animado del Zelvoq Plus.',
  'El modelo junto a la firma Zelvoq.',
] as const;
const splitDescriptions = [
  'Tu capa y estado en una mitad; tu ritmo de escritura en la otra.',
  'Tu capa y estado junto a un compañero que reacciona al escribir.',
  'Tu capa y estado junto al logo Zelvoq.',
] as const;
type Phase =
  'reading' | 'ready' | 'applying' | 'unsupported' | 'error' | 'disconnected';

export function OledPanel({
  api,
  deviceKey,
  ready,
  model = 'plus',
}: {
  api: OledAPI | null;
  deviceKey: string;
  ready: boolean;
  model?: OledModel;
}) {
  const split = model !== 'plus';
  const keyboardName = {
    plus: 'Zelvoq 60 Plus',
    corne: 'Corne',
    sofle: 'Sofle',
    lily58: 'Lily58',
  }[model];
  const [chosen, setChosen] = useState<OledMode>(0);
  const [enabled, setEnabled] = useState(true);
  const [confirmed, setConfirmed] = useState<OledState | null>(null);
  const [phase, setPhase] = useState<Phase>('reading');
  const [message, setMessage] = useState('');
  const [welcome, setWelcome] = useState(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const identity = useMemo(
    () => ({api, deviceKey, ready, model}),
    [api, deviceKey, ready, model],
  );
  const latest = useRef(identity);
  latest.current = identity;
  const assetBase = `${import.meta.env.BASE_URL}oled/`;

  function guard(ticket: number) {
    return (
      generation.current === ticket && latest.current === identity && ready
    );
  }

  async function load() {
    if (!api || !ready || busy.current) return;
    const ticket = generation.current;
    busy.current = true;
    setPhase('reading');
    setConfirmed(null);
    setMessage('');
    try {
      const state = await readOledState(api);
      if (!guard(ticket)) return;
      setConfirmed(state);
      setChosen(state.mode);
      setEnabled(state.enabled ?? true);
      setPhase('ready');
    } catch (error) {
      if (!guard(ticket)) return;
      setPhase(
        error instanceof UnsupportedFirmwareError ? 'unsupported' : 'error',
      );
      setMessage(
        error instanceof UnsupportedFirmwareError
          ? `El firmware no admite este control o su respuesta no es compatible. Actualiza el firmware de tu ${keyboardName} para habilitarlo.`
          : 'No pudimos leer la pantalla. Revisa la conexión del teclado y vuelve a intentarlo.',
      );
    } finally {
      if (guard(ticket)) busy.current = false;
    }
  }

  useEffect(() => {
    generation.current++;
    busy.current = false;
    setConfirmed(null);
    setMessage('');
    setWelcome(false);
    if (!api || !ready) {
      setPhase('disconnected');
    } else {
      void load();
    }
    return () => {
      generation.current++;
    };
  }, [identity]);

  useEffect(() => {
    if (!welcome) return;
    const timer = window.setTimeout(() => setWelcome(false), 2100);
    return () => window.clearTimeout(timer);
  }, [welcome]);

  async function apply() {
    if (!api || !ready || busy.current || !confirmed) return;
    const ticket = generation.current;
    const mode = chosen;
    busy.current = true;
    setPhase('applying');
    setMessage('');
    try {
      const result =
        confirmed.enabled === undefined
          ? await applyOledMode(api, mode, () => guard(ticket), deviceKey)
          : await applyOledSettings(
              api,
              mode,
              enabled,
              () => guard(ticket),
              deviceKey,
            );
      if (!guard(ticket)) return;
      setConfirmed(result);
      setPhase('ready');
      setMessage(
        result.enabled === false
          ? split
            ? 'Pantallas apagadas y guardadas en el teclado.'
            : 'Pantalla apagada y guardada en el teclado.'
          : `${OLED_MODES[mode]} guardado en el teclado.`,
      );
    } catch (error) {
      if (!guard(ticket) || error instanceof StaleOledSessionError) return;
      setConfirmed(null);
      setPhase('error');
      setMessage(
        'No pudimos confirmar el guardado. Revisa la conexión y vuelve a leer el teclado antes de aplicar de nuevo.',
      );
    } finally {
      if (guard(ticket)) busy.current = false;
    }
  }

  const waiting = phase === 'reading' || phase === 'applying';
  const canApply =
    phase === 'ready' &&
    confirmed &&
    (chosen !== confirmed.mode ||
      chosen !== confirmed.storedMode ||
      (confirmed.enabled !== undefined &&
        (enabled !== confirmed.enabled ||
          enabled !== confirmed.storedEnabled)));
  return (
    <Surface aria-label={split ? 'Pantallas OLED' : 'Pantalla OLED'}>
      <Content>
        <h2>{split ? 'Pantallas' : 'Pantalla'}</h2>
        <p>
          Elige cómo se ve tu Zelvoq. Prueba los diseños y guarda tu favorito en
          el teclado.
        </p>
        {split && (
          <p>
            Una mitad muestra tu capa y estado. La otra acompaña tu escritura
            con el diseño que elijas.
          </p>
        )}
        <Power>
          <input
            type="checkbox"
            checked={enabled}
            disabled={phase !== 'ready' || confirmed?.enabled === undefined}
            onChange={(event) => {
              setEnabled(event.target.checked);
              setWelcome(false);
              setMessage('');
            }}
          />
          {split ? 'Pantallas encendidas' : 'Pantalla encendida'}
        </Power>
        <p>
          {confirmed?.enabled === undefined
            ? 'Elige tu diseño y guárdalo en el teclado.'
            : split
              ? 'Ambas permanecen encendidas mientras el computador esté activo. Puedes apagarlas juntas y conservar tu diseño.'
              : 'Encendida de forma continua mientras el computador esté activo. Puedes apagarla y conservar tu diseño.'}
        </p>
        {confirmed && confirmed.enabled === undefined && (
          <p>
            Actualiza el firmware de tu {keyboardName} para poder encender o
            apagar {split ? 'las pantallas' : 'la pantalla'}.
          </p>
        )}
        <Preview>
          <OledDesignPreview
            assetBase={assetBase}
            model={model}
            mode={chosen}
            enabled={enabled}
            welcome={welcome}
          />
        </Preview>
        <p>
          {enabled
            ? 'Vista previa · actividad de escritura de ejemplo.'
            : split
              ? 'Vista previa · ambas pantallas apagadas.'
              : 'Vista previa · pantalla apagada.'}
        </p>
        {model === 'corne' && (
          <p>
            La mitad con USB muestra capa y WPM; la otra, el modelo y el diseño
            elegido. Al cambiar el USB de lado, estas funciones cambian de
            pantalla.
          </p>
        )}
        <PreviewAction
          type="button"
          onClick={() => setWelcome(true)}
          disabled={welcome || !enabled}
        >
          Ver bienvenida
        </PreviewAction>
        <Designs role="group" aria-label="Diseño de pantalla">
          {OLED_MODES.map((name, index) => (
            <Design
              key={name}
              type="button"
              $selected={chosen === index}
              aria-pressed={chosen === index}
              disabled={phase === 'applying'}
              onClick={() => {
                setChosen(index as OledMode);
                setWelcome(false);
                setMessage('');
              }}
            >
              <img
                src={`${assetBase}${split ? `split/${model}/secondary-` : ''}${OLED_PREVIEW_FILES[index]}.png`}
                width="128"
                height="32"
                alt=""
              />
              <strong>{name}</strong>
              <span>
                {
                  (model === 'corne'
                    ? corneDescriptions
                    : split
                      ? splitDescriptions
                      : descriptions)[index]
                }
              </span>
            </Design>
          ))}
        </Designs>
        {confirmed && (
          <p>
            En el teclado: <strong>{OLED_MODES[confirmed.mode]}</strong>
            {confirmed.enabled !== undefined &&
              ` · ${split ? (confirmed.enabled ? 'Encendidas' : 'Apagadas') : confirmed.enabled ? 'Encendida' : 'Apagada'}`}
            {confirmed.enabled !== confirmed.storedEnabled &&
              confirmed.storedEnabled !== undefined &&
              ` · Guardada: ${confirmed.storedEnabled ? 'Encendida' : 'Apagada'}`}
            {confirmed.mode !== confirmed.storedMode &&
              ` · Guardado: ${OLED_MODES[confirmed.storedMode]}`}
          </p>
        )}
        <div role={phase === 'error' ? 'alert' : 'status'} aria-live="polite">
          {phase === 'reading'
            ? 'Leyendo la pantalla del teclado…'
            : phase === 'applying'
              ? 'Aplicando y verificando el guardado…'
              : phase === 'disconnected'
                ? `Conecta tu ${keyboardName} para configurar ${split ? 'las pantallas' : 'la pantalla'}.`
                : message}
        </div>
        <Actions>
          <button
            type="button"
            disabled={!canApply || waiting}
            onClick={() => void apply()}
          >
            Aplicar y guardar
          </button>
          <button
            type="button"
            disabled={!api || !ready || waiting}
            onClick={() => void load()}
          >
            Releer teclado
          </button>
        </Actions>
      </Content>
    </Surface>
  );
}
