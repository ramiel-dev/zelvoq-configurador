import React, {useEffect, useMemo, useRef, useState} from 'react';
import styled from 'styled-components';
import {
  applyOledMode,
  OLED_MODES,
  readOledState,
  StaleOledSessionError,
  UnsupportedFirmwareError,
} from '../../../utils/zelvoq-oled';
import type {OledAPI, OledMode, OledState} from '../../../utils/zelvoq-oled';

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
const Preview = styled.div`
  background: #080b0a;
  border: 1px solid var(--border_color_cell);
  border-radius: 12px;
  padding: 24px;
  margin: 22px 0 8px;
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
const files = ['pulso', 'companion', 'signature'] as const;
type Phase =
  'reading' | 'ready' | 'applying' | 'unsupported' | 'error' | 'disconnected';

export function OledPanel({
  api,
  deviceKey,
  ready,
}: {
  api: OledAPI | null;
  deviceKey: string;
  ready: boolean;
}) {
  const [chosen, setChosen] = useState<OledMode>(0);
  const [confirmed, setConfirmed] = useState<OledState | null>(null);
  const [phase, setPhase] = useState<Phase>('reading');
  const [message, setMessage] = useState('');
  const [welcome, setWelcome] = useState(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const identity = useMemo(
    () => ({api, deviceKey, ready}),
    [api, deviceKey, ready],
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
      setPhase('ready');
    } catch (error) {
      if (!guard(ticket)) return;
      setPhase(
        error instanceof UnsupportedFirmwareError ? 'unsupported' : 'error',
      );
      setMessage(
        error instanceof UnsupportedFirmwareError
          ? 'El firmware no admite este control o su respuesta no es compatible. Actualiza el firmware Plus para habilitarlo.'
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
      const result = await applyOledMode(
        api,
        mode,
        () => guard(ticket),
        deviceKey,
      );
      if (!guard(ticket)) return;
      setConfirmed(result);
      setPhase('ready');
      setMessage(`${OLED_MODES[mode]} guardado en el teclado.`);
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
    (chosen !== confirmed.mode || chosen !== confirmed.storedMode);
  const image = welcome ? 'welcome' : files[chosen];
  return (
    <Surface aria-label="Pantalla OLED">
      <Content>
        <h2>Pantalla</h2>
        <p>
          Elige cómo se ve tu Zelvoq. Prueba los diseños y guarda tu favorito en
          el teclado.
        </p>
        <Preview>
          <picture key={image}>
            <source
              media="(prefers-reduced-motion: reduce)"
              srcSet={`${assetBase}${image}.png`}
            />
            <img
              src={`${assetBase}${image}.gif`}
              width="128"
              height="32"
              alt={
                welcome
                  ? 'Bienvenida Zelvoq'
                  : `Vista previa de ${OLED_MODES[chosen]}`
              }
            />
          </picture>
        </Preview>
        <p>Vista previa · actividad de escritura de ejemplo.</p>
        <PreviewAction
          type="button"
          onClick={() => setWelcome(true)}
          disabled={welcome}
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
                src={`${assetBase}${files[index]}.png`}
                width="128"
                height="32"
                alt=""
              />
              <strong>{name}</strong>
              <span>{descriptions[index]}</span>
            </Design>
          ))}
        </Designs>
        {confirmed && (
          <p>
            En el teclado: <strong>{OLED_MODES[confirmed.mode]}</strong>
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
                ? 'Conecta tu Zelvoq 60 Plus para configurar la pantalla.'
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
