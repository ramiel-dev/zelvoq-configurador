import React, {useEffect, useMemo, useRef, useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faDesktop,
  faPowerOff,
  faPlay,
  faCheck,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import {
  Surface,
  Content,
  Header,
  PowerRow,
  Power,
  Preview,
  PreviewAction,
  PreviewCaption,
  DesignHeading,
  Designs,
  Design,
  Footer,
  SaveState,
  Message,
  Actions,
} from './oled-panel-styles';
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

const descriptions = [
  'Un pulso que sigue tu ritmo de escritura.',
  'Un pequeño compañero que reacciona mientras escribes.',
  'La firma Zelvoq en una vista sobria.',
] as const;
const splitDescriptions = [
  'Tu modelo junto a un pulso que sigue tu ritmo.',
  'Tu modelo y una mascota que reacciona al escribir.',
  'Tu modelo junto a la firma Zelvoq. Simple y sobrio.',
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
        <Header>
          <div>
            <span className="model">
              {keyboardName} · {split ? 'OLED dual' : 'OLED'}
            </span>
            <h2>{split ? 'Pantallas' : 'Pantalla'}</h2>
            <p>
              Un detalle que hace tuyo el teclado. Elige un diseño y guarda tu
              favorito.
            </p>
          </div>
          <span className="display-icon" aria-hidden="true">
            <FontAwesomeIcon icon={faDesktop} />
          </span>
        </Header>
        <PowerRow>
          <div className="power-copy">
            <FontAwesomeIcon className="power-icon" icon={faPowerOff} />
            <div>
              <strong>
                {split
                  ? enabled
                    ? 'Pantallas encendidas'
                    : 'Pantallas apagadas'
                  : enabled
                    ? 'Pantalla encendida'
                    : 'Pantalla apagada'}
              </strong>
              <p>
                {confirmed?.enabled === undefined
                  ? 'El encendido requiere firmware compatible.'
                  : enabled
                    ? split
                      ? 'Encendidas mientras el computador esté activo.'
                      : 'Encendida mientras el computador esté activo.'
                    : 'Tu diseño se conserva al apagar.'}
              </p>
            </div>
          </div>
          <Power>
            <input
              type="checkbox"
              aria-label={split ? 'Pantallas encendidas' : 'Pantalla encendida'}
              checked={enabled}
              disabled={phase !== 'ready' || confirmed?.enabled === undefined}
              onChange={(event) => {
                setEnabled(event.target.checked);
                setWelcome(false);
                setMessage('');
              }}
            />
            <span aria-hidden="true" />
          </Power>
        </PowerRow>
        {confirmed && confirmed.enabled === undefined && (
          <PreviewCaption>
            <p>
              Actualiza el firmware de tu {keyboardName} para poder encender o
              apagar {split ? 'las pantallas' : 'la pantalla'}.
            </p>
          </PreviewCaption>
        )}
        <Preview>
          <div className="preview-toolbar">
            <div className="preview-title">
              <strong>VISTA PREVIA</strong>
              <span className="mode">
                {welcome
                  ? 'Bienvenida'
                  : enabled
                    ? OLED_MODES[chosen]
                    : 'Apagada'}
              </span>
            </div>
            <PreviewAction
              type="button"
              onClick={() => setWelcome(true)}
              disabled={welcome || !enabled}
            >
              <FontAwesomeIcon icon={faPlay} />
              Ver bienvenida
            </PreviewAction>
          </div>
          <div className="preview-body">
            <OledDesignPreview
              assetBase={assetBase}
              model={model}
              mode={chosen}
              enabled={enabled}
              welcome={welcome}
            />
          </div>
        </Preview>
        <PreviewCaption>
          <p>
            {enabled
              ? 'Vista previa · actividad de escritura de ejemplo.'
              : split
                ? 'Vista previa · ambas pantallas apagadas.'
                : 'Vista previa · pantalla apagada.'}
          </p>
          {split && (
            <p>
              USB: capa y WPM. Otra mitad: modelo y diseño. Al cambiar el USB de
              lado, las vistas también cambian.
            </p>
          )}
        </PreviewCaption>
        <DesignHeading>
          <h3>Elige tu diseño</h3>
          <p>Tres formas de acompañar tu escritura.</p>
        </DesignHeading>
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
              <span className="design-heading">
                <strong>{name}</strong>
                <span className="selection" aria-hidden="true">
                  {chosen === index && <FontAwesomeIcon icon={faCheck} />}
                </span>
              </span>
              <div className="thumbnail">
                <img
                  src={`${assetBase}${split ? `split/${model}/secondary-` : ''}${OLED_PREVIEW_FILES[index]}.png`}
                  width="128"
                  height="32"
                  alt=""
                />
              </div>
              <span className="description">
                {(split ? splitDescriptions : descriptions)[index]}
              </span>
            </Design>
          ))}
        </Designs>
        <Message
          $error={phase === 'error'}
          role={phase === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {phase === 'reading'
            ? 'Leyendo la pantalla del teclado…'
            : phase === 'applying'
              ? 'Aplicando y verificando el guardado…'
              : phase === 'disconnected'
                ? `Conecta tu ${keyboardName} para configurar ${split ? 'las pantallas' : 'la pantalla'}.`
                : message}
        </Message>
        <Footer>
          <div>
            <SaveState $pending={!!canApply}>
              {phase === 'applying'
                ? 'Guardando en el teclado…'
                : phase === 'ready'
                  ? canApply
                    ? 'Cambios sin guardar'
                    : 'Todo guardado en el teclado'
                  : phase === 'reading'
                    ? 'Leyendo configuración…'
                    : 'Configuración sin confirmar'}
            </SaveState>
            {confirmed && (
              <p className="device-state">
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
          </div>
          <Actions>
            <button
              type="button"
              disabled={!canApply || waiting}
              onClick={() => void apply()}
            >
              <FontAwesomeIcon icon={faCheck} />
              Aplicar y guardar
            </button>
            <button
              type="button"
              disabled={!api || !ready || waiting}
              onClick={() => void load()}
            >
              <FontAwesomeIcon icon={faRotateRight} />
              Releer teclado
            </button>
          </Actions>
        </Footer>
      </Content>
    </Surface>
  );
}
